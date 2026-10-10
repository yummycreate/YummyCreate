#!/usr/bin/env node
// 「作業完了＝PRレビュー&マージ」を強制する Stop フック。依存パッケージなし。
// Claude Code / Codex / Cursor / Antigravity 共通。原本は AIC の .agents/hooks/ にあり、各リポジトリへは
// `npm run sync:common` で配る（直接編集しない）。
//
// 使い方（設定ファイルから）:
//   node .agents/hooks/stop-require-merge.mjs --tool claude|codex|cursor|antigravity
// 入力: stdin のJSON（各ツールのStopフック入力）。出力（終了コードは常に0）:
//   claude / codex: block時のみ {"decision":"block","reason":"..."}。許可時は何も出さない
//   cursor        : block時のみ {"followup_message":"..."}。許可時は何も出さない
//   antigravity   : block時 {"decision":"continue","reason":"..."}、許可時 {"decision":"stop"}（decision必須）
// 再入判定: claude/codex は stop_hook_active、cursor は loop_count>0 または status!=completed、
//   antigravity は terminationReason!=model_stop / fullyIdle=false、およびblock直後の停止（目印ファイル）。
//
// block条件（現在のブランチがデフォルトブランチ以外で、作業の痕跡がある場合のみ）:
//   (a) 未コミット変更（untracked含む）がある
//   (b) origin/<デフォルトブランチ> にもリモートブランチにも無いコミットがある（未push）
//   (c) pushずみだが origin/<デフォルト> に無いコミットがあり、PRが無い／未マージ（gh で確認）
// 許可: デフォルトブランチ上、origin/<デフォルト> と同一でクリーン、再入（stop_hook_active 等）、
//       ghが使えない／失敗（stderrに理由）、フック自身の例外。
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { resolve, join } from "node:path";

const GIT_TIMEOUT_MS = 15_000;
const GH_TIMEOUT_MS = 20_000;

export function run(cmd, args, cwd, timeout = GIT_TIMEOUT_MS) {
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    timeout,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GIT_OPTIONAL_LOCKS: "0", GH_PROMPT_DISABLED: "1", GH_NO_UPDATE_NOTIFIER: "1" },
  });
  return { ok: !r.error && r.status === 0, status: r.status, stdout: r.stdout || "", stderr: r.stderr || "", error: r.error };
}

const git = (cwd, ...args) => run("git", args, cwd);
const out = (r) => r.stdout.trim();

// デフォルトブランチ名（origin/HEAD → origin/main → origin/master → "main"）。
export function defaultBranch(cwd) {
  const head = git(cwd, "symbolic-ref", "--short", "refs/remotes/origin/HEAD");
  if (head.ok && out(head).startsWith("origin/")) return out(head).slice("origin/".length);
  for (const name of ["main", "master"]) {
    if (git(cwd, "rev-parse", "--verify", "--quiet", `refs/remotes/origin/${name}`).ok) return name;
  }
  return "main";
}

// 現在のブランチを判定して { decision: "allow"|"block", reasons, notes } を返す。例外は呼び出し側で許可に倒す。
export function evaluate(cwd) {
  const notes = [];
  const allow = (why) => ({ decision: "allow", reasons: [], notes: [...notes, why] });

  const top = git(cwd, "rev-parse", "--show-toplevel");
  if (!top.ok) return allow("gitリポジトリではない");
  const branch = out(git(cwd, "rev-parse", "--abbrev-ref", "HEAD"));
  if (!branch || branch === "HEAD") return allow("detached HEAD（ブランチが特定できない）");

  const def = defaultBranch(cwd);
  if (branch === def || branch === "main" || branch === "master") {
    return allow(`デフォルトブランチ(${branch})上では判定しない`);
  }

  const reasons = [];
  const dirtyOut = git(cwd, "status", "--porcelain");
  if (!dirtyOut.ok) return allow("git status に失敗");
  const dirtyCount = dirtyOut.stdout.split("\n").filter((l) => l.trim() !== "").length;
  if (dirtyCount > 0) reasons.push(`未コミットの変更が${dirtyCount}件ある`);

  // origin/<default> に無いコミット数。基準が無い（originなし等）場合は不明として扱う。
  const baseRef = `refs/remotes/origin/${def}`;
  const hasBase = git(cwd, "rev-parse", "--verify", "--quiet", baseRef).ok;
  let ahead = null;
  if (hasBase) {
    const r = git(cwd, "rev-list", "--count", `${baseRef}..HEAD`);
    if (r.ok) ahead = Number.parseInt(out(r), 10);
  } else {
    notes.push(`origin/${def} が無いためコミット差を判定できない`);
  }

  // リモートブランチ（upstream、無ければ origin/<branch>）に無いコミット数。
  let unpushed = null;
  if (ahead !== 0) {
    const up = git(cwd, "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}");
    const remoteRef = up.ok ? out(up) : `origin/${branch}`;
    if (git(cwd, "rev-parse", "--verify", "--quiet", `refs/remotes/${remoteRef}`).ok) {
      const r = git(cwd, "rev-list", "--count", `refs/remotes/${remoteRef}..HEAD`);
      if (r.ok) unpushed = Number.parseInt(out(r), 10);
    } else if (ahead !== null) {
      unpushed = ahead; // リモートブランチ自体が無い → origin/<default> との差がすべて未push
    }
  }

  if (unpushed !== null && unpushed > 0) reasons.push(`リモートにpushされていないコミットが${unpushed}件ある`);

  // 作業の痕跡が無い（クリーンかつ origin/<default> と同一）なら許可。
  if (reasons.length === 0 && ahead === 0) return allow(`origin/${def} と同一でクリーン`);
  if (reasons.length > 0) return { decision: "block", reasons, notes, branch, def };

  // ここに来るのは「クリーン・pushずみ・origin/<default> に無いコミットあり（または基準不明）」。PRを gh で確認する。
  if (ahead === null) return allow("origin基準が無くPRの要否を判定できない");
  const headSha = out(git(cwd, "rev-parse", "HEAD"));
  const pr = run("gh", ["pr", "list", "--head", branch, "--state", "all", "--limit", "20",
    "--json", "number,state,url,headRefOid,mergedAt"], cwd, GH_TIMEOUT_MS);
  if (!pr.ok) {
    const why = pr.error ? pr.error.message : (pr.stderr.trim().split("\n")[0] || `終了コード${pr.status}`);
    return allow(`gh でPR状態を確認できないため許可する: ${why}`);
  }
  let prs;
  try { prs = JSON.parse(pr.stdout || "[]"); if (!Array.isArray(prs)) throw new Error("配列でない"); }
  catch (e) { return allow(`gh の出力を解釈できないため許可する: ${e.message}`); }

  const open = prs.find((p) => p.state === "OPEN");
  if (open) {
    return { decision: "block", reasons: [`PR #${open.number} が未マージ（${open.url}）`], notes, branch, def };
  }
  // squash/rebaseマージではコミットが origin/<default> の祖先にならない。マージずみPRの先端と一致すれば完了とみなす。
  const merged = prs.find((p) => p.state === "MERGED" && p.headRefOid === headSha);
  if (merged) return allow(`PR #${merged.number} はマージずみ`);
  return {
    decision: "block",
    reasons: [`origin/${def} に無いコミットが${ahead}件あり、対応するマージずみPRが無い（PRなし、またはクローズ／マージ後の追加コミット）`],
    notes, branch, def,
  };
}

export function buildMessage(result) {
  return [
    `【作業完了の条件未達】ブランチ ${result.branch} は、PRのレビュー・マージまで完了していない。`,
    ...result.reasons.map((r) => `- ${r}`),
    "PRを作ってレビュー・マージするか、ユーザーから停止の指示があった場合はその旨を述べて停止してよい。",
  ].join("\n");
}

// Antigravity には stop_hook_active 相当の入力が無い。そこで、blockしたら会話ごとの目印ファイルを置き、
// 次のStopでそれを消して許可する（= 「blockの直後の停止」だけ通す。Claudeの stop_hook_active と同じ意味）。
function markerPath(conversationId) {
  const dir = process.env.AIC_STOP_HOOK_STATE_DIR || join(tmpdir(), "aic-stop-hook");
  return { dir, file: join(dir, `${String(conversationId).replace(/[^A-Za-z0-9_-]/g, "_")}.blocked`) };
}
export function consumeMarker(conversationId) {
  if (!conversationId) return false;
  const { file } = markerPath(conversationId);
  if (!existsSync(file)) return false;
  try { rmSync(file); } catch { /* 消せなくても再入として許可する */ }
  return true;
}
export function writeMarker(conversationId) {
  if (!conversationId) return false;
  try {
    const { dir, file } = markerPath(conversationId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, new Date().toISOString());
    return true;
  } catch { return false; }
}

// ツールごとの入力差を吸収し、{ tool, reentry, cwds } を返す。
export function parseInput(input, tool) {
  const t = tool ||
    (input.workspacePaths !== undefined || input.terminationReason !== undefined ? "antigravity"
      : input.loop_count !== undefined || input.hook_event_name === "stop" ? "cursor" : "claude");
  const list = t === "antigravity" ? input.workspacePaths : t === "cursor" ? input.workspace_roots : undefined;
  const roots = Array.isArray(list) ? list.filter((p) => typeof p === "string" && p) : [];
  const cwds = typeof input.cwd === "string" && input.cwd ? [input.cwd] : roots.length > 0 ? roots : [process.cwd()];
  let reentry;
  if (t === "cursor") {
    // Cursor: 自動フォローアップ後の再入は loop_count > 0。中断・エラー終了（status != completed）でも止めない。
    reentry = (Number(input.loop_count) || 0) > 0 || (input.status !== undefined && input.status !== "completed");
  } else if (t === "antigravity") {
    // Antigravity: 正常終了（model_stop）かつ完全にアイドルのときだけ判定する。再入は目印ファイルで見る（main内）。
    reentry = (input.terminationReason !== undefined && input.terminationReason !== "model_stop") || input.fullyIdle === false;
  } else {
    reentry = input.stop_hook_active === true;
  }
  return { tool: t, reentry, cwds };
}

// block時の出力。Cursorは followup_message（次のユーザー発言として自動送信）、Antigravityは decision=continue。
export function formatBlock(tool, message) {
  return tool === "cursor" ? JSON.stringify({ followup_message: message })
    : tool === "antigravity" ? JSON.stringify({ decision: "continue", reason: message })
    : JSON.stringify({ decision: "block", reason: message });
}
// 許可時の出力。Antigravityは decision が必須（continue以外なら停止を許可）。他は何も出さない。
export function formatAllow(tool) {
  return tool === "antigravity" ? JSON.stringify({ decision: "stop" }) : "";
}

function readStdin() {
  try {
    if (process.stdin.isTTY) return {};
    const text = readFileSync(0, "utf8");
    return text.trim() === "" ? {} : JSON.parse(text);
  } catch {
    return {};
  }
}

function main() {
  let tool;
  const emit = (s) => { if (s) process.stdout.write(s + "\n"); };
  try {
    const argv = process.argv.slice(2);
    const ti = argv.indexOf("--tool");
    tool = ti !== -1 ? argv[ti + 1] : undefined;
    const input = readStdin();
    const parsed = parseInput(input, tool);
    tool = parsed.tool;
    // 目印ファイルは「直前のStopでblockした」印。再入判定とは独立に、Stopのたびに消費する。
    const marked = tool === "antigravity" ? consumeMarker(input.conversationId) : false;
    if (parsed.reentry || marked) return void emit(formatAllow(tool));
    let blocked = null;
    for (const cwd of parsed.cwds) {
      const result = evaluate(cwd);
      for (const n of result.notes) process.stderr.write(`[stop-require-merge] ${n}\n`);
      if (result.decision === "block") { blocked = result; break; }
    }
    if (!blocked) return void emit(formatAllow(tool));
    // Antigravityは目印を置けなければ再入を判別できない（無限ループ回避のため許可に倒す）。
    if (tool === "antigravity" && !writeMarker(input.conversationId)) {
      process.stderr.write("[stop-require-merge] 再入防止の目印を書けないため許可する\n");
      return void emit(formatAllow(tool));
    }
    emit(formatBlock(tool, buildMessage(blocked)));
  } catch (e) {
    process.stderr.write(`[stop-require-merge] フック内部エラーのため許可する: ${e && e.message}\n`);
    try { process.stdout.write(formatAllow(tool) ? formatAllow(tool) + "\n" : ""); } catch { /* 何もしない */ }
  }
}

// 直接実行のときだけ動く。シンボリックリンク経由（macOSの /tmp → /private/tmp 等）でも一致するよう実パスで比べる。
function isDirectRun() {
  if (!process.argv[1]) return false;
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); }
  catch { return resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
}

if (isDirectRun()) {
  main();
  process.exitCode = 0;
}

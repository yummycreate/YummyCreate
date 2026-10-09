// ビルド成果物 dist/ が、Deploy ワークフローのパス検証を通るかを先に確かめる。
// (ワークフロー側の検証と同じ規則。予約名の一覧は非公開 Secret にあるので、ここでは扱えない)
import { readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = new URL('../dist', import.meta.url).pathname;
if (!existsSync(dist)) {
  console.error('dist/ がありません。先に astro build を実行してください');
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    entry.isDirectory() ? walk(p) : files.push(relative(dist, p));
  }
})(dist);

const errors = [];
for (const f of files) {
  if (!/^[A-Za-z0-9._/+-]+$/.test(f) || f.includes('..')) errors.push(`安全でないパス: ${f}`);
  if (['.htaccess', '.user.ini', 'php.ini'].includes(f)) errors.push(`ルート直下に置けないファイル: ${f}`);
}
if (!files.includes('index.html')) errors.push('index.html がありません(トップページが出力されていません)');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`dist OK (${files.length} files)`);

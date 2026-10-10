@AGENTS.md

# YummyCreate — Claude 運用メモ

`https://yummycreate.com/` のドメインルートに置く公開サイトです。Astro(静的サイトジェネレーター)でビルドした静的HTMLを置く構成です。サーバー側でPHP等は動かしません。

## 公開リポジトリとしての注意

このリポジトリは **Public** です。コミットした内容はすべて誰でも読めます。

- パスワード・APIキー・秘密鍵・`.env` をコミットしない。
- サーバーのアカウント名・SSH接続情報・個人情報・非公開プロジェクトの情報をコード・ドキュメント・コミットメッセージに書かない。
- 接続情報は GitHub の Environment `production` の Secrets にだけ置く(下記)。

## 方針

趣味の知見を「ちゃんと教える」サイト(ブログではない)。収益はAdSenseとアフィリエイトの両方で、小さく手堅く。稼ぐことが主目的ではなく、刺さる人に刺さればいい。企画と監修は本人、文章はAI。生半可なものは出さない。

- 広告のための記事の細分化や、遷移なしの広告再読み込みはしない。ページの単位は1章=1URLで、広告は章の切れ目に置く。
- アフィリエイトリンクには「PR」表記を付ける。

## 構成

- `src/` — サイトのソース
  - `src/content/` — コンテンツ(Markdown)。各ファイルに `status`(draft / reviewed / published)を持たせる。**published 以外は本番ビルドに出力されない**(開発サーバーでは確認用に表示)
  - `src/content/books/` — WEB書籍の章。1ファイル=1章=1URL。ファイル名は `<book>-<chapter>.<locale>.md`。URLは `/book/<book>/<chapter>/`(英語は `/en/book/…`)
  - `src/components/ChapterPage.astro` — 書籍リーダー。JSが動くときだけ画面幅に応じて1〜3ページの横めくりにし、JSなしでは通常の縦の文章として読める
  - `src/pages/` — ルーティング。`[...locale].astro` が言語別のトップページ、`sitemap.xml.ts` がsitemap(hreflang付き)
  - `src/layouts/` `src/styles/` `src/lib/` `src/i18n.ts`
- `public/` — ビルドせずそのまま出力される静的ファイル(`robots.txt` など)
- `dist/` — ビルド成果物。**これがデプロイ対象**(Git管理外)
- `scripts/check-dist.mjs` — `dist/` のパスがデプロイのパス検証を通るかをビルド時に確認
- `.github/workflows/deploy.yml` — ビルドとデプロイ
- `.claude/launch.json` — ローカル確認用の開発サーバー設定

### 多言語

日本語がルート(`/`)、英語は `/en/`。言語ごとにファイルを分け、各言語版が published のときだけ出力・hreflang・sitemapに載る。ルート直下に `.htaccess` を置けないため、アクセス元による言語の自動振り分けはしない(Googlebotが日本語ページを見られなくなる問題もある)。

### ビルド出力の注意

デプロイのパス検証は英数字と `. _ / - +` のみ許す。そのためアセットのディレクトリ名は `assets`(Astro既定の `_astro` は使わない)、ハッシュは16進に固定している(`astro.config.mjs`)。

## ローカル確認

```bash
npm install
npm run dev
```

http://127.0.0.1:8950/ を開く。本番相当の出力は `npm run build`(`dist/` に出力され、パス検証も走る)。

## デプロイ

- `main` への push で GitHub Actions「Deploy」が自動で走り、`npm run build` した `dist/` をSFTPでアップロードする。手動実行(workflow_dispatch)も可。
- 最後に `https://yummycreate.com/` が200を返すことを確認する。
- **アップロードのみで、サーバー上のファイルは削除しない。** ビルド結果から消えたファイル(公開をやめたページ、旧ハッシュのアセット)はサーバーに残るので、必要ならサーバー側で個別に削除する。公開ゲートで非公開に戻した場合も同様。

### ドメインルートは他プロジェクトと共有している

サーバーのドメインルートには、別リポジトリの非公開プロジェクトのディレクトリが同居している。ワークフローは次を拒否してデプロイを止める:

- 他プロジェクトのディレクトリと同じトップレベル名(大文字小文字を区別せず判定。予約名の一覧は Secret `YC_RESERVED_TOPLEVEL` にあり、リポジトリには書かない)
- ルート直下の `.htaccess` / `.user.ini` / `php.ini`(配下の全プロジェクトに効いてしまうため)。サブディレクトリ内に置くのは可。ルートに必要になった時はユーザーに確認してから、ワークフローのガードと合わせて変更する。

### Secrets(Environment `production`、`main` ブランチからのみ参照可)

| 名前 | 内容 |
|---|---|
| `YC_SSH_HOST` / `YC_SSH_PORT` / `YC_SSH_USER` | SFTP接続先 |
| `YC_SSH_PRIVATE_KEY` | デプロイ用SSH秘密鍵 |
| `YC_SSH_KNOWN_HOSTS` | 接続先のホスト鍵(known_hosts形式) |
| `YC_RESERVED_TOPLEVEL` | ドメインルートで使用禁止のトップレベル名(空白区切り) |

## 作業の進め方

- 作業ブランチで編集 → ビルド確認 → `main` にマージして push(= デプロイ)→ 公開URLで確認。**動作確認は公開ページで行うので、実装後は必ずデプロイする。** ただし `status` が published でない文面は公開されない(監修前の下書きを published にしない)。
- 入力系(`input`/`textarea`/`select`)のフォントサイズは16px未満にしない(iOS Safariの入力時ズーム防止)。

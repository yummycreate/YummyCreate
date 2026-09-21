# YummyCreate — Claude 運用メモ

`https://yummycreate.com/` のドメインルートに置く公開サイトです。PHP＋静的ファイル構成で、ビルド工程はありません。

## 公開リポジトリとしての注意

このリポジトリは **Public** です。コミットした内容はすべて誰でも読めます。

- パスワード・APIキー・秘密鍵・`.env` をコミットしない。
- サーバーのアカウント名・SSH接続情報・個人情報・非公開プロジェクトの情報をコード・ドキュメント・コミットメッセージに書かない。
- 接続情報は GitHub の Environment `production` の Secrets にだけ置く(下記)。

## 構成

- `public/` — デプロイ対象。中身がそのままサーバーのドメインルート(`web/public_html/`)に置かれる。
  - `public/index.php` — トップページ
  - `public/assets/` — CSS/JS/画像
- `.github/workflows/deploy.yml` — デプロイ
- `.aic/tasks/` — 作業単位(グローバルフックが編集の前提として要求する)
- `.claude/launch.json` — ローカル確認用のPHP組み込みサーバー設定

## ローカル確認

```bash
php -S 127.0.0.1:8950 -t public
```

## デプロイ

- `main` への push で GitHub Actions「Deploy」が自動で走り、`public/` をSFTPでアップロードする。手動実行(workflow_dispatch)も可。
- 最後に `https://yummycreate.com/` が200を返すことを確認する。
- **アップロードのみで、サーバー上のファイルは削除しない。** `public/` から消したファイルはサーバーに残るので、必要ならサーバー側で個別に削除する。

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

- ファイル編集にはグローバルフックの都合で、作業ブランチ・worktree・`.aic/tasks/` の作業単位が必要。
- 作業ブランチで編集 → `main` にマージして push(= デプロイ)。
- 入力系(`input`/`textarea`/`select`)のフォントサイズは16px未満にしない(iOS Safariの入力時ズーム防止)。

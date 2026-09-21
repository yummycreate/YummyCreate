# Task: YummyCreate 初期セットアップ

## やること

- `public/` をデプロイ対象とする PHP＋静的ファイル構成の雛形を作る
- `main` への push で `public/` をドメインルートへアップロードする Deploy ワークフローを作る
  - 接続情報は Environment `production` の Secrets に置く
  - 他プロジェクトと同居するドメインルートを壊さないガード(予約名・ルート設定ファイルの拒否、削除しない)
- 公開リポジトリ `yummycreate/YummyCreate` を作成して push する

## 完了条件

- `https://yummycreate.com/` がトップページ(準備中)を返す
- 同居している他プロジェクトのURLの応答が変わっていない

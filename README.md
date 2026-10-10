# YummyCreate

## 名前と目的

[yummycreate.com](https://yummycreate.com/) のサイトです。

## 要件定義

未定義（ユーザーが記述する）

## ディレクトリ構成

上位ディレクトリ: なし（リポジトリのルート）

- `src/` — サイトのソース(Astro)。コンテンツは `src/content/`
- `public/` — そのまま出力される静的ファイル
- `.github/workflows/deploy.yml` — `main` への push でビルドしてサーバーへデプロイ
- `scripts/` — `check-dist.mjs`（ビルド時に `dist/` のパスがデプロイのパス検証を通るか確認）
- `.aic/tasks/` — タスク記述
- `dist/` — ビルド成果物。デプロイ対象（Git 管理外）

## ローカルで確認する

```bash
npm install
npm run dev
```

ブラウザで http://127.0.0.1:8950/ を開きます。

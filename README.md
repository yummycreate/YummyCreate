# YummyCreate

[yummycreate.com](https://yummycreate.com/) のサイトです。

## 構成

- `src/` — サイトのソース(Astro)。コンテンツは `src/content/`
- `public/` — そのまま出力される静的ファイル
- `.github/workflows/deploy.yml` — `main` への push でビルドしてサーバーへデプロイ

## ローカルで確認する

```bash
npm install
npm run dev
```

ブラウザで http://127.0.0.1:8950/ を開きます。

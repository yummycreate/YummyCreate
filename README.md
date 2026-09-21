# YummyCreate

[yummycreate.com](https://yummycreate.com/) のサイトです。

## 構成

- `public/` — 公開ファイル(PHP＋静的ファイル、ビルドなし)
- `.github/workflows/deploy.yml` — `main` への push でサーバーへデプロイ

## ローカルで確認する

```bash
php -S 127.0.0.1:8950 -t public
```

ブラウザで http://127.0.0.1:8950/ を開きます。

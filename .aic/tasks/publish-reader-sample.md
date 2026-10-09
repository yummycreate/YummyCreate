# Task: リーダーのサンプル章を公開ページで確認できるようにする

## やること

- 章のフロントマターに `noindex` を追加し、true の章には `<meta name="robots" content="noindex">` を出す
- 日本語のサンプル章(guide-01 / guide-02)を published + noindex にして公開する(英語は draft のまま)

## 完了条件

- 公開ページで `/book/guide/01/` が表示でき、横めくりが動く
- そのページに noindex が入っている

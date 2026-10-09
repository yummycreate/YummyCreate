# Task: CSS と JS をHTMLに埋め込み、別ファイルの読み込みに依存しない

## やること

- CSS は `build.inlineStylesheets: 'always'`、リーダーの JS は `src/scripts/reader.js` を `?raw` で読み込み、`<script is:inline>` で埋め込む
- 確認用ブラウザでは `/assets/` 以下の読み込みがブロックされ、紙の回転が動かなかったため

## 完了条件

- dist に別ファイルの CSS/JS が出ない
- 公開ページで、紙が回っている途中の状態が確認できる

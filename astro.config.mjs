import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://yummycreate.com',
  trailingSlash: 'always',
  // 日本語はルート、英語は /en/ 。ルート直下に .htaccess を置けないため、言語の自動振り分けはしない
  i18n: {
    locales: ['ja', 'en'],
    defaultLocale: 'ja',
    routing: { prefixDefaultLocale: false },
  },
  build: {
    // 既定の _astro はデプロイ時のパス検証(英数字と . _ / - のみ、かつ先頭が予約名でない)に紛れやすいので固定する
    assets: 'assets',
  },
  vite: {
    build: {
      rollupOptions: {
        // ハッシュに - や _ が混ざらないよう16進にする(パス検証を確実に通すため)
        output: { hashCharacters: 'hex' },
      },
    },
  },
});

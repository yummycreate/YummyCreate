import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 公開ゲート: published 以外の言語版はビルドで出力しない(開発サーバーでは確認用に表示する)
//   draft     = AIの下書き。まだ見ていない
//   reviewed  = 監修済み。公開はまだ
//   published = 公開
export const status = z.enum(['draft', 'reviewed', 'published']);

const home = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/home' }),
  schema: z.object({
    locale: z.enum(['ja', 'en']),
    status,
    title: z.string(),
    description: z.string(),
    tagline: z.string(),
    areas: z.array(z.object({ name: z.string(), summary: z.string() })),
  }),
});

// WEB書籍。1ファイル=1章=1URL。ファイル名は <book>-<chapter>.<locale>.md
const books = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/books' }),
  schema: z.object({
    locale: z.enum(['ja', 'en']),
    status,
    book: z.string(), // 本のID(URLの一部)
    bookTitle: z.string(),
    chapter: z.string(), // 章のID(URLの一部。順序の並び替えにも使う)
    title: z.string(),
    description: z.string(),
  }),
});

export const collections = { home, books };

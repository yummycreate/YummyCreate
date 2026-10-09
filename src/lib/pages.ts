import { getCollection, type CollectionEntry } from 'astro:content';
import { localePath, type Locale } from '../i18n';

export type HomeEntry = CollectionEntry<'home'>;

/** 公開ゲート。本番ビルドは published のみ、開発サーバーは確認用に全部通す */
export function isVisible(status: string): boolean {
  return import.meta.env.DEV || status === 'published';
}

export async function getVisibleHomes(): Promise<HomeEntry[]> {
  const all = await getCollection('home');
  return all.filter((e) => isVisible(e.data.status));
}

export async function getHome(locale: Locale): Promise<HomeEntry | undefined> {
  return (await getVisibleHomes()).find((e) => e.data.locale === locale);
}

export type ChapterEntry = CollectionEntry<'books'>;

export async function getVisibleChapters(): Promise<ChapterEntry[]> {
  const all = await getCollection('books');
  return all.filter((e) => isVisible(e.data.status));
}

/** 章のURLパス。日本語は /book/…、英語は /en/book/… */
export function chapterPath(locale: Locale, book: string, chapter: string): string {
  return localePath(locale, `book/${book}/${chapter}/`);
}

/** 同じ言語の同じ本の章を、章IDの順に並べる */
export function chaptersOf(all: ChapterEntry[], locale: Locale, book: string): ChapterEntry[] {
  return all
    .filter((e) => e.data.locale === locale && e.data.book === book)
    .sort((a, b) => a.data.chapter.localeCompare(b.data.chapter));
}

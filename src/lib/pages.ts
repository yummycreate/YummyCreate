import { getCollection, type CollectionEntry } from 'astro:content';
import type { Locale } from '../i18n';

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

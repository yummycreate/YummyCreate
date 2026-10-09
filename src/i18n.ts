export const locales = ['ja', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ja';

export const localeLabels: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
};

/** 言語ごとのパス。日本語はルート、それ以外は /<locale>/ */
export function localePath(locale: Locale, path = ''): string {
  const clean = path.replace(/^\/+/, '');
  return locale === defaultLocale ? `/${clean}` : `/${locale}/${clean}`;
}

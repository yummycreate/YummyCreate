import type { APIRoute } from 'astro';
import { getVisibleHomes } from '../lib/pages';
import { localePath, type Locale } from '../i18n';

// 公開ゲートを通ったページだけを載せ、hreflang の相互リンクも出力される言語版だけで組む
export const GET: APIRoute = async ({ site }) => {
  const homes = await getVisibleHomes();
  const alts = homes.map((h) => ({
    locale: h.data.locale as Locale,
    href: new URL(localePath(h.data.locale as Locale), site!).href,
  }));
  const xDefault = alts.find((a) => a.locale === 'ja') ?? alts[0];

  const urls = alts.map((a) => {
    const links =
      alts.length > 1
        ? [...alts, { locale: 'x-default', href: xDefault.href }]
            .map((l) => `    <xhtml:link rel="alternate" hreflang="${l.locale}" href="${l.href}"/>`)
            .join('\n')
        : '';
    return `  <url>\n    <loc>${a.href}</loc>${links ? '\n' + links : ''}\n  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

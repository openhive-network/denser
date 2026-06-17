import { test, expect } from '../support/fixture-proxy-test';

/**
 * Locale / i18n SSR checks (extends Obszar 6 + Obszar 9).
 *
 * The server resolves the UI language from the `NEXT_LOCALE` cookie — both for
 * the `<html lang/dir>` attributes (app/layout.tsx) and for the body copy
 * (i18n/client.ts `getLanguageFromCookie` reads it via next/headers during SSR).
 * So the initial HTML a crawler / no-JS user gets must already be in the right
 * language and direction, and a locale-varying response must not be globally
 * cacheable (or a shared cache serves an es page to an en user).
 *
 * Level: pure HTTP (Playwright `request`). `NEXT_LOCALE` does not change any RPC
 * params (feed data is locale-independent), so these replay against the
 * committed `ssrChecks` fixtures — no recording needed.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- ssrLocale
 */

const FEED_PATH = '/trending';
/** `navigation.communities_nav.all_posts` — SSR'd in the sidebar (SSR-06). */
const ALL_POSTS_EN = 'All posts';
const ALL_POSTS_ES = 'todos publican';

test.use({ fixtureTestName: 'ssrChecks' });

test.describe('SSR locale — html lang/dir from NEXT_LOCALE', () => {
  test('LOCALE-01 — NEXT_LOCALE=es renders <html lang="es"> in server HTML', async ({ request }) => {
    const html = await (await request.get(FEED_PATH, { headers: { cookie: 'NEXT_LOCALE=es' } })).text();
    expect(html).toMatch(/<html[^>]*lang="es"/);
  });

  test('LOCALE-02 — NEXT_LOCALE=ar renders <html dir="rtl"> in server HTML', async ({ request }) => {
    const html = await (await request.get(FEED_PATH, { headers: { cookie: 'NEXT_LOCALE=ar' } })).text();
    expect(html, 'RTL locale must set dir="rtl" server-side to avoid a layout flip on hydration').toMatch(
      /<html[^>]*dir="rtl"/
    );
  });
});

test.describe('SSR locale — body translation & cache isolation', () => {
  // Beyond the lang attribute: the actual copy must be translated in the server
  // HTML, not swapped in only after the client i18n boots.
  test('LOCALE-03 — server HTML body is translated to the locale (not just <html lang>)', async ({
    request
  }) => {
    const html = await (await request.get(FEED_PATH, { headers: { cookie: 'NEXT_LOCALE=es' } })).text();
    expect(html, 'expected the Spanish sidebar string in the server HTML').toContain(ALL_POSTS_ES);
    expect(html, 'English copy should not leak through on an es request').not.toContain(ALL_POSTS_EN);
  });

  // Cache-correctness (sibling of SAFE-05/06 for the observer cookie): the feed
  // is rendered per NEXT_LOCALE, so it must not be publicly cacheable — otherwise
  // a shared cache serves one user's language to another.
  test('LOCALE-04 — locale-varying feed differs per cookie and is not publicly cacheable', async ({
    request
  }) => {
    const esRes = await request.get(FEED_PATH, { headers: { cookie: 'NEXT_LOCALE=es' } });
    const enRes = await request.get(FEED_PATH, { headers: { cookie: 'NEXT_LOCALE=en' } });
    const esHtml = await esRes.text();
    const enHtml = await enRes.text();

    expect(esHtml).toMatch(/<html[^>]*lang="es"/);
    expect(enHtml).toMatch(/<html[^>]*lang="en"/);

    const cacheControl = (esRes.headers()['cache-control'] ?? '').toLowerCase();
    expect(cacheControl, 'locale-varying feed is publicly cacheable').not.toContain('public');
    expect(cacheControl, 'locale-varying feed allows shared-cache storage').not.toContain('s-maxage');
  });
});

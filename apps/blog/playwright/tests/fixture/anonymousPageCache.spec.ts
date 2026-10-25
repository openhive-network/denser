import type { APIResponse } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';

/**
 * Pages sent to a visitor without personalizing cookies may be stored by a shared cache.
 *
 * The middleware marks a page request public (packages/middleware/lib/public-cache.ts) when it
 * is a GET or HEAD document request without a `*_session`, `observer`, `observer-no-own-lists`,
 * `account_info` or `NEXT_LOCALE` cookie; the Node.js server sends no-store instead for any status
 * other than 200, a response that sets a cookie, or an `_rsc` URL (Next strips `_rsc` from the URL
 * the middleware sees). Everything else keeps Next's no-store.
 *
 * Production build only: `next dev` sends its own Cache-Control. Each request is made from a fresh
 * context, so no cookie from an earlier response is sent back.
 *
 * Reads server responses only, so it reuses the trending feed recording.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const PUBLIC_CACHE_CONTROL = 'public, s-maxage=30, stale-while-revalidate=60, stale-if-error=300';

interface PageAnswer {
  status: number;
  cacheControl: string | undefined;
  setCookies: string[];
}

const answerOf = (response: APIResponse): PageAnswer => ({
  status: response.status(),
  cacheControl: response.headers()['cache-control'],
  setCookies: response
    .headersArray()
    .filter(({ name }) => name.toLowerCase() === 'set-cookie')
    .map(({ value }) => value)
});

const expectNotPublic = (answer: PageAnswer, what: string) => {
  expect(answer.cacheControl, what).toContain('no-store');
  expect(answer.cacheControl, what).not.toContain('public');
};

test.describe('Anonymous page responses — shared-cache headers', () => {
  let get: (path: string, headers?: Record<string, string>, method?: 'GET' | 'HEAD') => Promise<PageAnswer>;

  test.beforeEach(({ playwright, baseURL }) => {
    get = async (path, headers = {}, method = 'GET') => {
      const context = await playwright.request.newContext({ baseURL });
      try {
        const response = await context.fetch(path, { method, headers, maxRedirects: 0 });
        return answerOf(response);
      } finally {
        await context.dispose();
      }
    };
  });

  test('PAGE-CACHE-01 — an anonymous feed is public and sets no cookie, at /trending and at /', async () => {
    for (const path of ['/trending', '/']) {
      const answer = await get(path);
      expect(answer.status, path).toBe(200);
      expect(answer.cacheControl, path).toBe(PUBLIC_CACHE_CONTROL);
      expect(answer.setCookies, path).toEqual([]);
    }
    const head = await get('/trending', {}, 'HEAD');
    expect(head.cacheControl).toBe(PUBLIC_CACHE_CONTROL);
  });

  test('PAGE-CACHE-02 — a request with a session, observer, account or language cookie is no-store', async () => {
    // Values the server renders the default observer and language for, so the recording answers
    for (const cookie of [
      'blog_session=not-a-sealed-session',
      'observer=hive.blog',
      'observer-no-own-lists=hive.blog',
      'account_info=hive.blog:hbauth',
      'NEXT_LOCALE=en'
    ]) {
      const answer = await get('/trending', { cookie });
      expect(answer.status, cookie).toBe(200);
      expectNotPublic(answer, cookie);
    }
  });

  test('PAGE-CACHE-03 — client router requests are never public', async () => {
    for (const [what, path, headers] of [
      ['RSC header', '/trending', { RSC: '1' }],
      ['RSC prefetch', '/trending', { RSC: '1', 'Next-Router-Prefetch': '1' }],
      ['_rsc query', '/trending?_rsc=abc12', {}]
    ] as const) {
      const answer = await get(path, headers);
      expect(answer.cacheControl, what).not.toContain('public');
    }
  });

  test('PAGE-CACHE-04 — a page that is not found is not public', async () => {
    const answer = await get('/no/such/route/in/the/blog');
    expect(answer.status).toBe(404);
    expectNotPublic(answer, '404');
  });
});

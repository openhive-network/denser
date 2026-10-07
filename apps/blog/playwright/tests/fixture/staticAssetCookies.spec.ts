import type { APIResponse } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';

/**
 * Static asset responses carry no cookies.
 *
 * The middleware (proxy.ts, packages/middleware) sets the login challenge and
 * session_uid cookies on every response it runs on. A Set-Cookie on a build asset
 * or a public file keeps shared caches and CDNs from storing it, so proxy.ts's
 * matcher leaves /_next/static, /_next/image and public files out. Pages, including
 * the .html ones and account pages whose names end in what looks like an
 * extension, still get the cookies and the CSP.
 *
 * Each request is made from a fresh context: one that kept the page's cookies
 * would send them back, and the middleware sets no cookie a request already has.
 *
 * Reads server responses only, so it reuses the trending feed recording.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const CHUNK_URL_PATTERN = /\/_next\/static\/[^"'\s\\]+\.(?:js|css)/g;

const setCookieNames = (response: APIResponse): string[] =>
  response
    .headersArray()
    .filter(({ name }) => name.toLowerCase() === 'set-cookie')
    .map(({ value }) => value.split('=')[0]);

test.describe('Static assets — no middleware cookies', () => {
  test('STATIC-COOKIES-01 — a page sets the challenge cookies; its /_next/static chunks and public files set none', async ({
    playwright,
    baseURL
  }) => {
    const get = async (path: string) => {
      const context = await playwright.request.newContext({ baseURL });
      try {
        const response = await context.get(path, { maxRedirects: 0 });
        return { status: response.status(), cookies: setCookieNames(response), headers: response.headers(), body: await response.text() };
      } finally {
        await context.dispose();
      }
    };

    const page = await get('/trending');
    expect(page.status).toBe(200);
    expect(page.cookies).toEqual(expect.arrayContaining(['blog_login_challenge_server', 'session_uid']));
    expect(page.headers['content-security-policy']).toBeTruthy();

    const assets = [...new Set(page.body.match(CHUNK_URL_PATTERN) ?? [])];
    expect(assets.length).toBeGreaterThan(0);
    for (const path of [...assets, '/favicon.ico', '/locales/en/common_blog.json', '/auth/worker.js']) {
      const asset = await get(path);
      expect(asset.status, path).toBe(200);
      expect(asset.cookies, path).toEqual([]);
    }
  });

  test('STATIC-COOKIES-02 — .html pages and @ paths ending in an extension still run the middleware', async ({
    playwright,
    baseURL
  }) => {
    // An account name may end in ".png"; under /api the path renders no profile,
    // which would need recorded account data.
    for (const path of ['/faq.html', '/api/@abc.png', '/api/%40abc.json']) {
      const context = await playwright.request.newContext({ baseURL });
      try {
        const response = await context.get(path, { maxRedirects: 0 });
        expect(setCookieNames(response), path).toContain('blog_login_challenge_server');
      } finally {
        await context.dispose();
      }
    }
  });
});

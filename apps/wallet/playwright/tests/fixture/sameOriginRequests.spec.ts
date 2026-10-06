import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';

/**
 * Requests a wallet page makes to its own origin.
 *
 * On the subdirectory deployment the wallet shares its origin with the blog, so a URL without the
 * wallet's base path lands on the blog: `/favicon.ico` redirects to `/blog` and makes the blog
 * server render a feed on every wallet page view. Every same-origin URL a page requests, or links
 * as an icon, script or stylesheet, has to stay under the base path. The `<link>` and `<script>`
 * URLs are checked as well as the requests because headless Chromium does not fetch favicons.
 */

const isUnderBasePath = (pathname: string): boolean =>
  pathname === WALLET_BASE_PATH || pathname.startsWith(`${WALLET_BASE_PATH}/`);

const collectReferencedUrls = (page: Page): Promise<string[]> =>
  page.evaluate(() => [
    ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]'), (link) => link.href),
    ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'), (script) => script.src)
  ]);

test.describe('Same-origin requests', () => {
  test('WALLET-PERF-ORIGIN-01 — a logged-out /@gtg/permissions load requests and links nothing outside the base path', async ({
    page,
    baseURL
  }) => {
    const origin = new URL(baseURL ?? '').origin;
    const requestedUrls: string[] = [];
    page.on('request', (request) => requestedUrls.push(request.url()));

    const response = await page.goto(`${WALLET_BASE_PATH}/@gtg/permissions`, { waitUntil: 'load' });
    expect(response?.status()).toBe(200);
    const referencedUrls = await collectReferencedUrls(page);

    const outsideBasePath = [...requestedUrls, ...referencedUrls]
      .map((url) => new URL(url))
      .filter((url) => url.origin === origin && !isUnderBasePath(url.pathname))
      .map((url) => url.pathname);
    expect(referencedUrls.some((url) => new URL(url).pathname === `${WALLET_BASE_PATH}/favicon.ico`)).toBe(true);
    expect([...new Set(outsideBasePath)]).toEqual([]);
  });
});

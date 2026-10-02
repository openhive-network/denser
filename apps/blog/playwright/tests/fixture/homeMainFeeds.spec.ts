import type { Request } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage, MOBILE_VIEWPORT } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';

/**
 * Home & Main Feeds fixture tests — covers section 1.1 of the
 * "Test Plan - Page View Verification (Anonymous & Logged-In User)" wiki.
 *
 * Scope: anonymous user, view/rendering verification only (no state mutation).
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

test.use({ fixtureTestName: 'homeMainPage' });

// playwright.fixture.config.ts sets REACT_APP_IMAGES_ENDPOINT to https://images.hive.blog/.
const IMAGES_ORIGIN = 'https://images.hive.blog';
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

const isWasmRequest = (request: Request) => new URL(request.url()).pathname.endsWith('.wasm');
const isHiveSenseRequest = (request: Request) => new URL(request.url()).pathname.includes('/hivesense-api/');

const decodeHtmlAttribute = (value: string) => value.replace(/&amp;/g, '&');

function getImagePreloads(html: string): string[] {
  return [...html.matchAll(/<link rel="preload" as="image"[^>]*>/g)].map(([link]) => link);
}

function getFirstCardImageSrcSet(html: string): string | undefined {
  return html.match(/<img srcSet="([^"]+)" alt="Post image"/)?.[1];
}

test.describe('Home & Main Feeds (fixture-based)', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('ANON-HOME-01 — root URL serves the trending feed without redirecting', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // The root path serves the trending feed via an internal middleware rewrite
    // (no client-visible redirect), so the URL stays at / instead of /trending.
    await expect(page).toHaveURL(/\/$/);
    await expect(page).not.toHaveURL(/\/trending$/);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  });

  test('ANON-HOME-02 — Trending feed renders header, sidebar and post cards', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getHomeNavLink).toBeVisible();
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();

    const postCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postCount).toBeGreaterThan(0);
  });

  test('ANON-HOME-03 — Hot feed renders and "Hot" filter is active', async ({ page }) => {
    await page.goto('/hot', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getFilterPosts).toHaveText('Hot', { timeout: TIMEOUTS.HYDRATION });
  });

  test('ANON-HOME-04 — Created feed renders and "New" filter is active', async ({ page }) => {
    await page.goto('/created', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getFilterPosts).toHaveText('New', { timeout: TIMEOUTS.HYDRATION });
  });

  test('ANON-HOME-05 — Payout feed renders and "Payouts" filter is active', async ({ page }) => {
    await page.goto('/payout', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getFilterPosts).toHaveText('Payouts', { timeout: TIMEOUTS.HYDRATION });
  });

  test('ANON-HOME-06 — Muted feed page loads with "Muted" filter active', async ({ page }) => {
    await page.goto('/muted', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getFilterPosts).toHaveText('Muted', { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });

  test('ANON-HOME-07 — First post card exposes title, author, timestamp, votes and payout', async ({
    page
  }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    await expect(homePage.getFirstPostTitle).toBeVisible();
    await expect(homePage.getFirstPostTitle).not.toHaveText('');

    await expect(homePage.getFirstPostAuthor).toBeVisible();
    const authorHref = await homePage.getFirstPostAuthor.getAttribute('href');
    expect(authorHref).toMatch(/^\/@.+/);

    await expect(homePage.getFirstPostCardTimestampLink).toBeVisible();
    await expect(homePage.getFirstPostPayout).toBeVisible();
    await expect(homePage.getFirstPostPayout).toHaveText(/\$\d/);
    await expect(homePage.getFirstPostVotes).toBeVisible();
  });

  test('ANON-HOME-08 — Sidebar visible on desktop, hidden on mobile breakpoint', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();

    await page.setViewportSize(MOBILE_VIEWPORT);
    await expect(homePage.getTrendingCommunitiesSideBar).toBeHidden();
  });

  test('ANON-HOME-09 — Sidebar menu exposes FAQ, Privacy Policy and Terms of Service links', async ({
    page
  }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    await homePage.getNavSidebarMenu.waitFor({ state: 'visible' });
    await expect(async () => {
      await homePage.getNavSidebarMenu.click();
      await homePage.getNavSidebarMenuContent.waitFor({ state: 'visible', timeout: 5000 });
    }).toPass({ timeout: 20000, intervals: [1000, 2000, 3000] });

    const menu = homePage.getNavSidebarMenuContent;
    await expect(menu.getByRole('button', { name: 'FAQ' })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Privacy Policy' })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Terms of Service' })).toBeVisible();
  });

  // The wax wasm (~2.4 MB) is fetched when the chain is created. The feed needs
  // no chain to render, so neither it nor the header's hivesense status probe
  // may run before the browser is idle. Idle callbacks are held back to make
  // "before idle" deterministic, then released.
  test('ANON-HOME-10 — Trending feed does not create the wax chain before idle', async ({ page }) => {
    await page.addInitScript(() => {
      const held: IdleRequestCallback[] = [];
      Object.assign(window, { __heldIdleCallbacks: held });
      window.requestIdleCallback = (callback) => held.push(callback);
      window.cancelIdleCallback = () => {};
    });
    const requestsBeforeIdle: Request[] = [];
    const collect = (request: Request) => requestsBeforeIdle.push(request);
    page.on('request', collect);

    await page.goto('/trending', { waitUntil: 'load' });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await page.waitForLoadState('networkidle');
    page.off('request', collect);

    expect(requestsBeforeIdle.filter(isWasmRequest).map((request) => request.url())).toEqual([]);
    expect(requestsBeforeIdle.filter(isHiveSenseRequest).map((request) => request.url())).toEqual([]);

    const hiveSenseProbe = page.waitForRequest(isHiveSenseRequest, { timeout: TIMEOUTS.HYDRATION });
    const wasmWarmup = page.waitForRequest(isWasmRequest, { timeout: TIMEOUTS.HYDRATION });
    await page.evaluate(() => {
      const { __heldIdleCallbacks: held } = window as unknown as { __heldIdleCallbacks: IdleRequestCallback[] };
      held.splice(0).forEach((callback) => callback({ didTimeout: false, timeRemaining: () => 50 }));
    });
    await hiveSenseProbe;
    await wasmWarmup;
  });

  test('ANON-HOME-11 — Trending server HTML carries no other accounts\' votes', async ({ page }) => {
    const serverHtml = await (await page.request.get('/trending')).text();

    expect(serverHtml).toContain('data-testid="post-list-item"');
    // The recorded trending posts have votes from roelandp and others; none belong to the anonymous observer.
    expect(serverHtml).not.toMatch(/\\"voter\\":/);
  });

  test('ANON-HOME-12 — Trending server HTML preconnects to the image host and preloads only the first card image', async ({ page }) => {
    const serverHtml = await (await page.request.get('/trending')).text();

    expect(serverHtml).toContain(`<link rel="preconnect" href="${IMAGES_ORIGIN}"/>`);
    expect(serverHtml).toContain(`<link rel="dns-prefetch" href="${IMAGES_ORIGIN}"/>`);

    const imagePreloads = getImagePreloads(serverHtml);
    expect(imagePreloads).toHaveLength(1);
    const [preload] = imagePreloads;
    const firstCardSrcSet = getFirstCardImageSrcSet(serverHtml);
    expect(firstCardSrcSet).toMatch(new RegExp(`^${IMAGES_ORIGIN}/`));
    expect(preload).toContain(`imageSrcSet="${firstCardSrcSet}"`);
    expect(preload).toContain('fetchPriority="high"');
    expect(preload).not.toContain('imageSizes');
    expect(serverHtml.indexOf(preload)).toBeLessThan(serverHtml.indexOf('data-testid="post-list-item"'));
  });

  test('ANON-HOME-13 — Trending fetches the preloaded first card image only once', async ({ page }) => {
    const serverHtml = await (await page.request.get('/trending')).text();
    const firstCardSrcSet = getFirstCardImageSrcSet(serverHtml);
    expect(firstCardSrcSet).toBeTruthy();
    const firstCardImageUrl = decodeHtmlAttribute(firstCardSrcSet ?? '');

    await page.route(`${IMAGES_ORIGIN}/**`, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: ONE_PIXEL_PNG })
    );
    const firstCardImageRequests: Request[] = [];
    page.on('request', (request) => {
      if (request.url() === firstCardImageUrl) firstCardImageRequests.push(request);
    });

    await page.goto('/trending', { waitUntil: 'load' });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await page.waitForLoadState('networkidle');

    expect(firstCardImageRequests).toHaveLength(1);
  });
});

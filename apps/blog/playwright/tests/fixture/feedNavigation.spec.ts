import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import type { Page, Request } from '@playwright/test';

/**
 * Feed navigation loading state — client-side navigation between feeds shows
 * the post-list skeleton while the target route is pending, without a
 * route-level Suspense boundary (ssrSeoGuard.spec.ts guards the server HTML).
 *
 * The proxy holds the server's `bridge.get_ranked_posts` call for the target
 * feed, so the pending state is observed deterministically, then releases it
 * and the new feed must render. NAV-02 checks the client router cache does not
 * serve a feed visited seconds ago instead of asking the server again.
 *
 * Fixtures: reuses `homeMainPage` (recorded with JS on; read-only on replay).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- feedNavigation
 */

test.use({ fixtureTestName: 'homeMainPage' });
test.skip(isRecordMode, 'replay-only: shares the homeMainPage recording');

/** First post of the recorded anonymous /hot feed (homeMainPage 0004). */
const HOT_FIRST_POST_HREF = '/hive-153850/@steemflow/before-you-judge-before-you';

/** React hydration-mismatch signatures: minified prod codes + dev text. */
const HYDRATION_ERROR =
  /Minified React error #(418|423|425|421|422)\b|hydrat|did not match|Text content does not match/i;

function collectHydrationErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && HYDRATION_ERROR.test(msg.text())) errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    if (HYDRATION_ERROR.test(err.message)) errors.push(err.message);
  });
  return errors;
}

/** Client-navigation (non-prefetch) RSC requests for `pathname`, in order. */
function collectRscNavigations(page: Page, pathname: string): Request[] {
  const requests: Request[] = [];
  page.on('request', (req) => {
    const headers = req.headers();
    if (headers['rsc'] !== '1' || headers['next-router-prefetch']) return;
    if (new URL(req.url()).pathname === pathname) requests.push(req);
  });
  return requests;
}

async function openFeedFilter(homePage: HomePage) {
  // The first click can land before hydration attaches handlers: retry it
  // until the options list opens.
  await expect(async () => {
    await homePage.getFilterPosts.click();
    await expect(homePage.getFilterPostsList).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: TIMEOUTS.HYDRATION });
}

test.describe('Feed navigation loading state', () => {
  test('NAV-01 — Trending → Hot shows the list skeleton while pending, then the Hot feed', async ({
    page,
    fixtureProxy
  }) => {
    const hydrationErrors = collectHydrationErrors(page);
    const homePage = new HomePage(page);
    const pending = page.getByTestId('feed-navigation-pending');

    await page.goto('/trending');
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(pending).toHaveCount(0);

    await openFeedFilter(homePage);

    const release = fixtureProxy.holdResponses(
      ({ method, params }) => method === 'bridge.get_ranked_posts' && params.sort === 'hot'
    );
    try {
      await page.getByRole('option', { name: 'Hot' }).click();

      await expect(pending).toBeVisible();
      await expect(homePage.getMainTimeLineOfPosts).toHaveCount(0);
      await expect(page).toHaveURL(/\/trending$/);
    } finally {
      release();
    }

    await expect(page).toHaveURL(/\/hot$/);
    await expect(pending).toHaveCount(0);
    await expect(
      homePage.getMainTimeLineOfPosts.first().locator(`a[href="${HOT_FIRST_POST_HREF}"]`).first()
    ).toBeAttached();
    await expect(homePage.getFilterPosts).toHaveText('Hot');

    expect(hydrationErrors, 'hydration errors').toEqual([]);
  });

  // The client router cache keeps dynamic pages for `staleTimes.dynamic`
  // (0 since Next 15, 30 s before), so returning to a feed within seconds must
  // ask the server for it again rather than replay the copy from the first
  // visit — and the server's answer must not be cacheable either.
  test('NAV-02 — returning to Trending refetches the feed from the server', async ({ page }) => {
    const homePage = new HomePage(page);
    const trendingFetches = collectRscNavigations(page, '/trending');

    await page.goto('/trending');
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    await openFeedFilter(homePage);
    await page.getByRole('option', { name: 'Hot' }).click();
    await expect(page).toHaveURL(/\/hot$/);
    await expect(homePage.getFilterPosts).toHaveText('Hot');
    const fetchesBeforeReturn = trendingFetches.length;

    await openFeedFilter(homePage);
    await page.getByRole('option', { name: 'Trending' }).click();
    await expect(page).toHaveURL(/\/trending$/);
    await expect(homePage.getFilterPosts).toHaveText('Trending');
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible();

    expect(trendingFetches.length, 'no RSC request for /trending on return').toBeGreaterThan(
      fetchesBeforeReturn
    );
    const response = await trendingFetches[trendingFetches.length - 1].response();
    expect(response?.status()).toBe(200);
    expect(response?.headers()['cache-control'] ?? '').toContain('no-store');
  });
});

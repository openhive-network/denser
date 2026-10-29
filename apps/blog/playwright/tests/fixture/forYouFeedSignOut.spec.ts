import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { TIMEOUTS } from '../support/constants';
import { OBSERVER, gotoLoggedIn } from '../support/postDisplayContext';
import { FIXTURE_COOKIE_NAME } from '../support/fixture-auth/constants';
import { asFypPage, recordedRankedPosts, serveFollowLists, serveFypFeed } from '../support/fypApiStub';
import enBlog from '../../../locales/en/common_blog.json';

/**
 * Signing out on the For You feed (`/for-you`): the feed is personal and the signed-out sort
 * selector has no For You option, so the sign-out takes the reader to Trending once the server has
 * ended the session. Meanwhile /for-you shows the list skeleton under a selector reading Trending,
 * never an empty selector or an empty list. Opening `/for-you` signed out is
 * forYouFeedSignedOut.spec.ts.
 *
 * Fixtures: `forYouSignOut`, the logged-in feeds with the anonymous Trending page's reads added.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- forYouFeedSignOut
 */

test.use({ fixtureTestName: 'forYouSignOut', authenticatedUser: {} });

const FEED = asFypPage(recordedRankedPosts('loggedInHomeFeeds', '0001-bridge.get_ranked_posts.json'));
const TRENDING_LABEL = 'Trending';
const DEFAULT_OBSERVER = 'hive.blog';
/** How long the logout answer is held back, so a navigation started before it would show */
const LOGOUT_DELAY_MS = 1500;
/** How soon after the sign-out click /for-you must show its leaving state */
const LEAVING_STATE_WITHIN_MS = 200;

type ForYouWatchState = {
  blankSelector: boolean;
  emptyList: boolean;
  clickedAt: number | null;
  leavingShownAt: number | null;
};
type ForYouWatch = { __forYouWatch: ForYouWatchState };

/**
 * Watches every animation frame while the page is on /for-you, recording in `window.__forYouWatch`
 * whether one showed an empty sort selector, or a list with neither cards nor the skeleton, and how
 * long after the sign-out click the skeleton first showed under a selector reading Trending. The
 * page is never reloaded, so the watch spans the client-side navigation.
 */
async function watchForYouWhileSigningOut(page: Page): Promise<void> {
  await page.evaluate((trendingLabel) => {
    const state: ForYouWatchState = {
      blankSelector: false,
      emptyList: false,
      clickedAt: null,
      leavingShownAt: null
    };
    (window as unknown as ForYouWatch).__forYouWatch = state;
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (target?.closest('[data-testid="user-profile-menu-logout-link"]')) {
          state.clickedAt = performance.now();
        }
      },
      { capture: true }
    );
    const check = () => {
      if (window.location.pathname.endsWith('/for-you')) {
        const selector = document.querySelector('[data-testid="posts-filter"]')?.textContent?.trim();
        const hasSkeleton = document.querySelector('[data-testid="post-list-skeleton"]') !== null;
        const hasCards = document.querySelector('li[data-testid="post-list-item"]') !== null;
        if (!selector) state.blankSelector = true;
        if (!hasSkeleton && !hasCards) state.emptyList = true;
        const showsLeaving = hasSkeleton && selector === trendingLabel;
        if (state.clickedAt !== null && state.leavingShownAt === null && showsLeaving) {
          state.leavingShownAt = performance.now();
        }
      }
      requestAnimationFrame(check);
    };
    check();
  }, TRENDING_LABEL);
}

const readWatch = (page: Page) =>
  page.evaluate(() => (window as unknown as ForYouWatch).__forYouWatch);

type TrendingRscRequest = {
  at: number;
  isPrefetch: boolean;
  cookie: string;
  body: string;
};

/**
 * Passes every RSC request for /trending (page data and prefetch alike) through, recording when it
 * left, its cookies and its answer's body, which the router discards once the page is shown.
 */
async function recordTrendingRscRequests(page: Page): Promise<TrendingRscRequest[]> {
  const requests: TrendingRscRequest[] = [];
  await page.route(
    (url) => url.pathname === '/trending',
    async (route) => {
      const headers = await route.request().allHeaders();
      if (headers['rsc'] !== '1') return route.fallback();
      const at = Date.now();
      const response = await route.fetch();
      const body = await response.text();
      const isPrefetch = Boolean(headers['next-router-prefetch']);
      requests.push({ at, isPrefetch, cookie: headers['cookie'] ?? '', body });
      await route.fulfill({ response, body });
    }
  );
  return requests;
}

/** Holds the logout request back for LOGOUT_DELAY_MS; `answeredAt` resolves when its answer arrives */
async function delayLogout(page: Page): Promise<{ answeredAt: Promise<number> }> {
  const isLogout = (url: string) => new URL(url).pathname.endsWith('/api/auth/logout');
  await page.route(
    (url) => isLogout(url.href),
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, LOGOUT_DELAY_MS));
      await route.continue();
    }
  );
  return { answeredAt: page.waitForResponse((response) => isLogout(response.url())).then(() => Date.now()) };
}

async function openForYouSignedIn(page: Page, homePage: HomePage): Promise<void> {
  await serveFollowLists(page, {});
  await serveFypFeed(page, [FEED]);
  await gotoLoggedIn(page, '/for-you');
  await expect(homePage.getFilterPosts).toHaveText(enBlog.select_sort.posts_sort.for_you, {
    timeout: TIMEOUTS.HYDRATION
  });
  await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
}

test.describe('For You feed — signing out', () => {
  test('FYP-07 — signing out on For You goes to Trending, with the Trending sort selected and no blank selector', async ({ page }) => {
    const homePage = new HomePage(page);
    await openForYouSignedIn(page, homePage);

    await homePage.profileAvatarButton.click();
    await watchForYouWhileSigningOut(page);
    await new ProfileUserMenu(page).logoutLink.click();

    await expect(homePage.loginBtn).toBeVisible();
    await expect(page).toHaveURL(/\/trending$/);
    await expect(homePage.getFilterPosts).toHaveText(TRENDING_LABEL);
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(page.getByTestId('for-you-sign-in')).toHaveCount(0);
    expect((await readWatch(page)).blankSelector).toBe(false);
  });

  test('FYP-08 — the sign-out shows the skeleton at once and loads Trending once, after the logout answer, as a signed-out reader', async ({ page }) => {
    const homePage = new HomePage(page);
    await openForYouSignedIn(page, homePage);
    const logout = await delayLogout(page);
    const trendingRequests = await recordTrendingRscRequests(page);

    await homePage.profileAvatarButton.click();
    await watchForYouWhileSigningOut(page);
    await new ProfileUserMenu(page).logoutLink.click();

    await expect(page.getByTestId('post-list-skeleton')).toBeVisible();
    await expect(homePage.getFilterPosts).toHaveText(TRENDING_LABEL);
    await expect(page).toHaveURL(/\/for-you$/);

    await expect(page).toHaveURL(/\/trending$/, { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getFilterPosts).toHaveText(TRENDING_LABEL);

    const watch = await readWatch(page);
    expect(watch.blankSelector, 'an empty sort selector on /for-you').toBe(false);
    expect(watch.emptyList, 'a list with neither cards nor skeleton on /for-you').toBe(false);
    expect(watch.clickedAt, 'the sign-out click was seen').not.toBeNull();
    expect(watch.leavingShownAt, 'the skeleton under a Trending selector').not.toBeNull();
    expect((watch.leavingShownAt ?? Infinity) - (watch.clickedAt ?? 0)).toBeLessThan(LEAVING_STATE_WITHIN_MS);

    const answeredAt = await logout.answeredAt;
    for (const { at } of trendingRequests) {
      expect(at, 'a /trending request left before the logout answer').toBeGreaterThanOrEqual(answeredAt);
    }
    const pageData = trendingRequests.filter(({ isPrefetch }) => !isPrefetch);
    expect(pageData, '/trending page-data requests').toHaveLength(1);
    const [{ cookie, body }] = pageData;
    expect(cookie).not.toContain(`${FIXTURE_COOKIE_NAME}=`);
    expect(body).not.toContain(`"value":"${OBSERVER}"`);
    expect(body).toContain(`"value":"${DEFAULT_OBSERVER}"`);
  });
});

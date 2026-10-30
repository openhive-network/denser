import type { Page } from '@playwright/test';
import { KeyType, LoginType } from '@smart-signer/types/common';
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
 * ended the session, or once it gave up waiting for the logout answer. Meanwhile /for-you shows the
 * list skeleton under a selector reading Trending, never an empty selector or an empty list. A
 * sign-out in another tab waits for that tab's logout answer, a sign-out outside the header menu in
 * this tab (a desync logout) for its own, and a list the reader picks while the
 * sign-out waits is where they stay. A logout answered after the sign-out stopped waiting renders
 * Trending again for the signed-out reader, and an answer left by an earlier logout does not count
 * for a later sign-out. Opening `/for-you` signed out is forYouFeedSignedOut.spec.ts.
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
/** Held back longer while the reader picks another list, still short of the sign-out's 5 s wait */
const LOGOUT_DELAY_WHILE_PICKING_MS = 3000;
/** Held back past the sign-out's 5 s wait, so the reader reaches Trending before the answer */
const SLOW_LOGOUT_DELAY_MS = 7000;
/** How soon after a logout answer, this tab's or another's, For You must start loading Trending */
const LEAVES_AFTER_ANSWER_WITHIN_MS = 1000;
/** How long before the test an earlier logout's answer was announced */
const EARLIER_LOGOUT_AGE_MS = 60_000;
/** How soon after the click a sign-out whose logout never answers must reach Trending */
const HUNG_LOGOUT_LEAVES_WITHIN_MS = 6000;
/** How long after the logout answer a navigation it started would have had to land */
const AFTER_LOGOUT_SETTLE_MS = 1500;
/** The marker a sign-out writes once its logout is answered (smart-signer's logout-done) */
const LOGOUT_DONE_KEY = 'denser:logout-done';
const HOT_LABEL = enBlog.select_sort.posts_sort.hot;
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

const isLogout = (url: string) => new URL(url).pathname.endsWith('/api/auth/logout');

/** Counts the logout requests the page sends from now on */
function countLogoutRequests(page: Page): () => number {
  let count = 0;
  page.on('request', (request) => {
    if (isLogout(request.url())) count += 1;
  });
  return () => count;
}

/** Holds the logout request back for `delayMs`; `answeredAt` resolves when its answer arrives */
async function delayLogout(page: Page, delayMs = LOGOUT_DELAY_MS): Promise<{ answeredAt: Promise<number> }> {
  await page.route(
    (url) => isLogout(url.href),
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await route.continue();
    }
  );
  return { answeredAt: page.waitForResponse((response) => isLogout(response.url())).then(() => Date.now()) };
}

/** Leaves the logout request unanswered for as long as the page lives */
async function hangLogout(page: Page): Promise<void> {
  await page.route((url) => isLogout(url.href), () => new Promise<void>(() => {}));
}

async function signOutFromHeader(page: Page, homePage: HomePage): Promise<void> {
  await homePage.profileAvatarButton.click();
  await new ProfileUserMenu(page).logoutLink.click();
}

/** Expects the /trending page data was loaded once, after `answeredAt`, for a signed-out reader */
function expectSignedOutTrendingLoad(trendingRequests: TrendingRscRequest[], answeredAt: number): void {
  const pageData = pageDataRequests(trendingRequests);
  expect(pageData, '/trending page-data requests').toHaveLength(1);
  const [{ at, cookie, body }] = pageData;
  expect(at, 'the /trending page data left before the logout answer').toBeGreaterThanOrEqual(answeredAt);
  expect(cookie).not.toContain(`${FIXTURE_COOKIE_NAME}=`);
  expect(body).not.toContain(`"value":"${OBSERVER}"`);
  expect(body).toContain(`"value":"${DEFAULT_OBSERVER}"`);
}

const pageDataRequests = (requests: TrendingRscRequest[]) => requests.filter(({ isPrefetch }) => !isPrefetch);

/** Leaves the marker an earlier logout's answer wrote, as announceLogoutDone writes it */
async function leaveEarlierLogoutDone(page: Page): Promise<void> {
  await page.evaluate(
    ([key, age]) => {
      const now = Date.now();
      window.localStorage.setItem(key, JSON.stringify({ value: now - age, expiresAt: now + age, createdAt: now - age }));
    },
    [LOGOUT_DONE_KEY, EARLIER_LOGOUT_AGE_MS] as const
  );
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
    expectSignedOutTrendingLoad(trendingRequests, answeredAt);
  });

  test('FYP-09 — a logout that never answers still takes the reader to Trending within the sign-out timeout', async ({ page }) => {
    const homePage = new HomePage(page);
    await openForYouSignedIn(page, homePage);
    await hangLogout(page);

    await signOutFromHeader(page, homePage);
    const clickedAt = Date.now();
    await expect(page.getByTestId('post-list-skeleton')).toBeVisible();

    await expect(page).toHaveURL(/\/trending$/, { timeout: HUNG_LOGOUT_LEAVES_WITHIN_MS });
    expect(Date.now() - clickedAt, 'time from the sign-out click to /trending').toBeLessThan(
      HUNG_LOGOUT_LEAVES_WITHIN_MS
    );
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(page.getByTestId('post-list-skeleton')).toHaveCount(0);
    await expect(homePage.getFilterPosts).toHaveText(TRENDING_LABEL);
  });

  test('FYP-10 — a sign-out in another tab takes For You to Trending only after that tab\'s logout answer, as a signed-out reader', async ({ page, context }) => {
    const homePage = new HomePage(page);
    await openForYouSignedIn(page, homePage);
    const trendingRequests = await recordTrendingRscRequests(page);

    const otherTab = await context.newPage();
    const otherHomePage = new HomePage(otherTab);
    await gotoLoggedIn(otherTab, '/hot');
    const logout = await delayLogout(otherTab);
    await signOutFromHeader(otherTab, otherHomePage);

    await expect(page.getByTestId('post-list-skeleton')).toBeVisible();
    await expect(page).toHaveURL(/\/trending$/, { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getFilterPosts).toHaveText(TRENDING_LABEL);
    await expect(otherTab).toHaveURL(/\/hot$/);

    const answeredAt = await logout.answeredAt;
    expectSignedOutTrendingLoad(trendingRequests, answeredAt);
    const [{ at }] = pageDataRequests(trendingRequests);
    expect(at - answeredAt, 'time from the other tab\'s logout answer to the /trending request').toBeLessThan(
      LEAVES_AFTER_ANSWER_WITHIN_MS
    );
  });

  test('FYP-11 — picking Hot while the sign-out waits for the logout answer leaves the reader on Hot', async ({ page }) => {
    const homePage = new HomePage(page);
    await openForYouSignedIn(page, homePage);
    const logout = await delayLogout(page, LOGOUT_DELAY_WHILE_PICKING_MS);
    let answered = false;
    void logout.answeredAt.then(() => (answered = true));

    await signOutFromHeader(page, homePage);
    await expect(homePage.getFilterPosts).toHaveText(TRENDING_LABEL);
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText(HOT_LABEL, { exact: true }).click();
    await expect(page).toHaveURL(/\/hot$/);
    expect(answered, 'the logout was answered before the reader reached Hot').toBe(false);

    await logout.answeredAt;
    await page.waitForFunction((key) => window.localStorage.getItem(key) !== null, LOGOUT_DONE_KEY);
    // The sign-out's own navigation, had it started on the answer, would have landed by now
    await page.waitForTimeout(AFTER_LOGOUT_SETTLE_MS);
    await expect(page).toHaveURL(/\/hot$/);
    await expect(homePage.getFilterPosts).toHaveText(HOT_LABEL);
  });

  test('FYP-12 — a logout answered after the sign-out stopped waiting renders Trending again for a signed-out reader', async ({ page }) => {
    const homePage = new HomePage(page);
    await openForYouSignedIn(page, homePage);
    const logout = await delayLogout(page, SLOW_LOGOUT_DELAY_MS);
    const trendingRequests = await recordTrendingRscRequests(page);

    await signOutFromHeader(page, homePage);
    await expect(page).toHaveURL(/\/trending$/, { timeout: HUNG_LOGOUT_LEAVES_WITHIN_MS });

    const answeredAt = await logout.answeredAt;
    await expect
      .poll(() => pageDataRequests(trendingRequests).filter(({ at }) => at >= answeredAt).length, {
        message: 'a /trending page-data request after the logout answer'
      })
      .toBeGreaterThan(0);
    const [rendered] = pageDataRequests(trendingRequests).filter(({ at }) => at >= answeredAt);
    expect(rendered.cookie).not.toContain(`${FIXTURE_COOKIE_NAME}=`);
    expect(rendered.body).not.toContain(OBSERVER);
    expect(rendered.body).toContain(`"value":"${DEFAULT_OBSERVER}"`);
    await expect(homePage.loginBtn).toBeVisible();
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getFilterPosts).toHaveText(TRENDING_LABEL);
  });
});

test.describe('For You feed — signing out when safe storage lost the keys', () => {
  test.use({ authenticatedUser: { loginType: LoginType.hbauth, keyType: KeyType.posting } });

  test('FYP-13 — an earlier logout\'s answer does not take For You to Trending before another tab\'s desync logout is answered', async ({ page, context }) => {
    const homePage = new HomePage(page);
    await openForYouSignedIn(page, homePage);
    await leaveEarlierLogoutDone(page);
    const trendingRequests = await recordTrendingRscRequests(page);

    const otherTab = await context.newPage();
    await gotoLoggedIn(otherTab, '/trending');
    const logout = await delayLogout(otherTab);
    // Safe storage holds no keys for the account: signing the vote signs the reader out
    await new HomePage(otherTab).getFirstPostUpvoteButton.click();
    await expect(otherTab.getByTestId('safe-storage-missing-message')).toBeVisible();

    await expect(page).toHaveURL(/\/trending$/, { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    expectSignedOutTrendingLoad(trendingRequests, await logout.answeredAt);
  });

  test('FYP-14 — a desync logout on For You itself takes the reader to Trending right after its one logout answer', async ({ page }) => {
    const homePage = new HomePage(page);
    await openForYouSignedIn(page, homePage);
    const trendingRequests = await recordTrendingRscRequests(page);
    const logoutRequests = countLogoutRequests(page);
    const logout = await delayLogout(page);

    // Safe storage holds no keys for the account: signing the vote signs the reader out
    await homePage.getFirstPostUpvoteButton.click();
    await expect(page.getByTestId('safe-storage-missing-message')).toBeVisible();

    await expect(page).toHaveURL(/\/trending$/, { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    const answeredAt = await logout.answeredAt;
    expectSignedOutTrendingLoad(trendingRequests, answeredAt);
    const [{ at }] = pageDataRequests(trendingRequests);
    expect(at - answeredAt, 'time from the logout answer to the /trending request').toBeLessThan(
      LEAVES_AFTER_ANSWER_WITHIN_MS
    );
    expect(logoutRequests(), 'logout requests sent for the one desync').toBe(1);
  });
});

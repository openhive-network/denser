import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import { gotoLoggedIn } from '../support/postDisplayContext';
import { clickUntilOpen } from '../support/uiPrimitives';
import {
  FYP_PAGE_SIZE,
  asFypPage,
  recordedRankedPosts,
  serveFollowLists,
  serveFypFeed,
  unsetFypApiUrlInBrowser,
  type FypFailure,
  type FypPost
} from '../support/fypApiStub';
import enBlog from '../../../locales/en/common_blog.json';

/**
 * The For You feed (`/for-you`, haf_fyp) for a signed-in reader, with FYP_API_URL set (the main
 * fixture server's setting, see fypApiStub.ts). The feed is answered with page.route from the
 * recorded trending (page 1) and hot (page 2) posts; the rest of the page replays the
 * logged-in feeds' recording. The reader's lists are answered in the browser too.
 *
 * The signed-out view is in forYouFeedSignedOut.spec.ts (another recording); the feed with the
 * setting unset is FYP-05 below.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- forYouFeed
 */

test.use({ fixtureTestName: 'loggedInHomeFeeds', authenticatedUser: {} });

const SORT_OPTIONS = ['Trending', 'Hot', 'New', 'Payouts', enBlog.select_sort.posts_sort.for_you, 'Muted'];
const FIRST_PAGE = asFypPage(recordedRankedPosts('loggedInHomeFeeds', '0001-bridge.get_ranked_posts.json'));
const firstPageKeys = new Set(FIRST_PAGE.map((post) => `${post.author}/${post.permlink}`));
// A short page: the end of the feed
const LAST_PAGE = asFypPage(
  recordedRankedPosts('loggedInHomeFeeds', '0008-bridge.get_ranked_posts.json')
    .filter((post) => !firstPageKeys.has(`${post.author}/${post.permlink}`))
    .slice(0, 5),
  FYP_PAGE_SIZE + 1
);
const MUTED_AUTHOR = 'worldmappin';
const BLACKLISTED_AUTHOR = 'ecency';
// How soon after its first feed request the page says the feed is down
const ERROR_TIMEOUT_MS = 5_000;

const postLink = (page: Page, post: FypPost) =>
  page.locator(`li[data-testid="post-list-item"] a[href*="/@${post.author}/${post.permlink}"]`).first();

test.describe('For You feed — signed in', () => {
  test('FYP-01 — the For You sort follows Pending, lists the feed and pages on scroll', async ({ page }) => {
    await serveFollowLists(page, {});
    const feedRequests = await serveFypFeed(page, [FIRST_PAGE, LAST_PAGE]);
    const homePage = new HomePage(page);
    await gotoLoggedIn(page, '/trending');

    await clickUntilOpen(homePage.getFilterPosts, homePage.getFilterPostsList);
    await expect(page.getByRole('option')).toHaveText(SORT_OPTIONS);
    await page.getByRole('option', { name: enBlog.select_sort.posts_sort.for_you }).click();

    await expect(page).toHaveURL(/\/for-you$/);
    await expect(postLink(page, FIRST_PAGE[0])).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getMainTimeLineOfPosts).toHaveCount(FYP_PAGE_SIZE);
    await expect(homePage.getFilterPosts).toHaveText(enBlog.select_sort.posts_sort.for_you);

    await page.getByRole('button', { name: enBlog.user_profile.load_newer }).scrollIntoViewIfNeeded();
    await expect(postLink(page, LAST_PAGE[0])).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getMainTimeLineOfPosts).toHaveCount(FYP_PAGE_SIZE + LAST_PAGE.length);
    await expect(page.getByText(enBlog.user_profile.nothing_more_to_load)).toBeVisible();

    const requested = feedRequests.map((request) => new URL(request.url()));
    expect(requested.map((url) => url.searchParams.get('page'))).toEqual(['1', '2']);
    expect(requested[0].pathname).toBe('/haf-fyp-api/v1/fyp/feed/guest4test');
    expect(requested[0].searchParams.get('page-size')).toBe(String(FYP_PAGE_SIZE));
  });

  test("FYP-02 — the reader's muted and blacklisted authors are dropped from the feed", async ({ page }) => {
    await serveFollowLists(page, { muted: [MUTED_AUTHOR], blacklisted: [BLACKLISTED_AUTHOR] });
    await serveFypFeed(page, [FIRST_PAGE]);
    const hidden = FIRST_PAGE.filter((post) => [MUTED_AUTHOR, BLACKLISTED_AUTHOR].includes(post.author));
    expect(hidden.length).toBeGreaterThan(1);

    await gotoLoggedIn(page, '/for-you');

    await expect(postLink(page, FIRST_PAGE[0])).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(new HomePage(page).getMainTimeLineOfPosts).toHaveCount(FIRST_PAGE.length - hidden.length);
    for (const post of hidden) await expect(postLink(page, post)).toHaveCount(0);
  });

  for (const [label, failure] of [
    ['an unreachable', 'connectionrefused'],
    ['a 503', 503]
  ] satisfies [string, FypFailure][]) {
    test(`FYP-03 — ${label} FYP API shows the For You error at once, and Trending still works`, async ({
      page
    }) => {
      await serveFollowLists(page, {});
      const feedRequests = await serveFypFeed(page, [], failure);
      await gotoLoggedIn(page, '/for-you');

      await expect.poll(() => feedRequests.length, { timeout: TIMEOUTS.HYDRATION }).toBeGreaterThan(0);
      const error = page.getByTestId('for-you-error');
      await expect(error).toBeVisible({ timeout: ERROR_TIMEOUT_MS });
      await expect(error).toContainText(enBlog.for_you_feed.unavailable);
      await expect(error).toContainText(enBlog.for_you_feed.service_not_responding);
      await expect(error.getByRole('button', { name: enBlog.user_profile.load_more_retry })).toBeEnabled();
      expect(feedRequests).toHaveLength(1);

      await error.getByRole('link', { name: enBlog.for_you_feed.go_to_trending }).click();
      await expect(page).toHaveURL(/\/trending$/);
      await expect(new HomePage(page).getMainTimeLineOfPosts.first()).toBeVisible({
        timeout: TIMEOUTS.HYDRATION
      });
    });
  }

  test('FYP-06 — Retry reads the feed again and lists it once the FYP API answers', async ({ page }) => {
    await serveFollowLists(page, {});
    const failedRequests = await serveFypFeed(page, [], 503);
    await gotoLoggedIn(page, '/for-you');
    const error = page.getByTestId('for-you-error');
    await expect(error).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    const retriedRequests = await serveFypFeed(page, [FIRST_PAGE]);
    await error.getByRole('button', { name: enBlog.user_profile.load_more_retry }).click();

    await expect(postLink(page, FIRST_PAGE[0])).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(error).toBeHidden();
    expect(failedRequests).toHaveLength(1);
    expect(retriedRequests.map((request) => new URL(request.url()).searchParams.get('page'))).toEqual(['1']);
  });

  test('FYP-05 — with FYP_API_URL unset there is no For You sort and /for-you is not found', async ({
    page,
    feedCacheBaseURL
  }) => {
    test.skip(!feedCacheBaseURL, 'no blog serves with FYP_API_URL unset');
    const response = await page.goto(`${feedCacheBaseURL}/for-you`);
    expect(response?.status()).toBe(404);

    await unsetFypApiUrlInBrowser(page);
    const homePage = new HomePage(page);
    await gotoLoggedIn(page, `${feedCacheBaseURL}/trending`);
    await clickUntilOpen(homePage.getFilterPosts, homePage.getFilterPostsList);
    await expect(page.getByRole('option')).toHaveText(
      SORT_OPTIONS.filter((option) => option !== enBlog.select_sort.posts_sort.for_you)
    );
  });
});

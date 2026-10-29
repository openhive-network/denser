import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import { gotoLoggedIn } from '../support/postDisplayContext';
import { settleAfterLoad } from '../support/wasmRequests';
import { asFypPage, recordedRankedPosts, serveFollowLists, serveFypFeed, serveFypWarmUp } from '../support/fypApiStub';

/**
 * The For You warm-up (haf_fyp's `/v1/fyp/warmup/{account}`) a signed-in reader's browser sends
 * once per browser session, so the feed is re-ranked before the reader opens it. FYP_API_URL is
 * set on the main fixture server (see fypApiStub.ts); the rest of the page replays the logged-in
 * feeds' recording.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- forYouWarmUp
 */

test.use({ fixtureTestName: 'loggedInHomeFeeds', authenticatedUser: {} });

const FIRST_PAGE = asFypPage(recordedRankedPosts('loggedInHomeFeeds', '0001-bridge.get_ranked_posts.json'));

test.describe('For You warm-up — signed in', () => {
  test('FYP-WARM-01 — the first page load warms the feed once; a reload in the session does not', async ({
    page
  }) => {
    const warmUps = await serveFypWarmUp(page);
    await gotoLoggedIn(page, '/trending');

    await expect.poll(() => warmUps.length, { timeout: TIMEOUTS.HYDRATION }).toBe(1);
    expect(new URL(warmUps[0].url()).pathname).toBe('/haf-fyp-api/v1/fyp/warmup/guest4test');
    expect(warmUps[0].method()).toBe('GET');

    await page.reload();
    await settleAfterLoad(page);
    expect(warmUps).toHaveLength(1);
  });

  test('FYP-WARM-02 — the For You page, already reading the feed, sends no warm-up', async ({ page }) => {
    await serveFollowLists(page, {});
    await serveFypFeed(page, [FIRST_PAGE]);
    const warmUps = await serveFypWarmUp(page);
    await gotoLoggedIn(page, '/for-you');

    await expect(new HomePage(page).getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await settleAfterLoad(page);
    expect(warmUps).toHaveLength(0);
  });
});

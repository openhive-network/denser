import { test } from '../support/fixture-proxy-test';
import { testI18nRoutes } from '../support/i18nLayout';
import { asFypPage, recordedRankedPosts, serveFollowLists, serveFypFeed } from '../support/fypApiStub';

/**
 * The signed-in reader's For You feed (`/for-you`) in the pseudo-locale and in Polish, at a desktop
 * and two phone viewports, in a wide font: every text is translated and fits
 * (playwright/support/i18n-layout.ts). The feed is answered in the browser from the recorded trending
 * posts and the rest of the page replays the logged-in feeds' recording, as in forYouFeed.spec.ts.
 */

test.use({ fixtureTestName: 'loggedInHomeFeeds', authenticatedUser: {} });

const FEED = asFypPage(recordedRankedPosts('loggedInHomeFeeds', '0001-bridge.get_ranked_posts.json'));

test.beforeEach(async ({ page }) => {
  await serveFollowLists(page, {});
  await serveFypFeed(page, [FEED]);
});

testI18nRoutes([{ id: 'FOR-YOU', path: '/for-you', ready: '[data-testid="post-list-item"]', loggedIn: true }]);

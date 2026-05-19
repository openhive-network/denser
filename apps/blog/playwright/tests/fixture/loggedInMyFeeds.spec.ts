import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import {
  MY_FEED_ROUTES,
  FILTER_LABEL,
  OBSERVER,
  myFriendsUrl,
  gotoLoggedIn
} from '../support/postDisplayContext';

/**
 * §4 Post Display & Views — personalised "My" feeds (logged-in observer).
 *
 * Covers VIEW-06 from the "Test Plan - Automation Test Cases" wiki —
 * the logged-in-only `/{filter}/my` and `/@{user}/feed` routes that
 * scope the corresponding main feed to subscribed communities (the
 * `/my` variants) or followed authors (the `/feed` route).
 *
 * Observer state at record time (CI_TEST_USER=guest4test):
 *   - `bridge.list_all_subscriptions` → 3 communities (hive-163772 /
 *     hive-167922 / hive-137823), so `/{sort}/my` returns a populated
 *     feed and the empty-state branch in list-of-posts.tsx:96 does NOT
 *     fire. Each `/{sort}/my` test asserts a visible first post card +
 *     the underlying sort's filter chip (PostSelectFilter derives its
 *     value from the first path segment, not the `my` tag).
 *   - `condenser_api.get_following(blog)` → empty, so `/@guest4test/feed`
 *     hits the friends-feed empty branch in posts-content.tsx:118 and
 *     surfaces the `user-has-not-started-blogging-yet` wrapper with the
 *     `user_profile.empty_feed_not_following` copy.
 *
 * If somebody subscribes guest4test to additional communities or
 * follows accounts on their behalf and re-records, the `/feed` test
 * will be the one to fail first (empty-state branch flips). The
 * `/{sort}/my` tests are forgiving — they assert "some post visible",
 * not which posts.
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog exec \
 *            playwright test --config=playwright.fixture.config.ts \
 *            loggedInMyFeeds.spec.ts
 *          node apps/blog/playwright/tests/support/fixture-auth/trim-fixtures.mjs \
 *            apps/blog/playwright/tests/mock/fixtures/loggedInMyFeeds
 */

test.use({
  fixtureTestName: 'loggedInMyFeeds',
  authenticatedUser: {}
});

const EMPTY_FRIENDS_FEED_TEXT =
  "You haven't followed anyone yet! Follow other users to see their posts here.";

test.describe('§4 Post Display & Views — My feeds (logged-in observer)', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  // ── VIEW-06a..e: `/{sort}/my` — subscribed-community feeds ────────────

  test('VIEW-06a — Trending — My communities renders feed scoped to subscriptions', async ({ page }) => {
    await gotoLoggedIn(page, MY_FEED_ROUTES.trending);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(homePage.getFilterPosts).toHaveText(FILTER_LABEL['/trending']);
    await expect(page).toHaveURL(/\/trending\/my$/);
  });

  test('VIEW-06b — Hot — My communities renders feed', async ({ page }) => {
    await gotoLoggedIn(page, MY_FEED_ROUTES.hot);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(homePage.getFilterPosts).toHaveText(FILTER_LABEL['/hot']);
    await expect(page).toHaveURL(/\/hot\/my$/);
  });

  test('VIEW-06c — Created/New — My communities renders feed', async ({ page }) => {
    await gotoLoggedIn(page, MY_FEED_ROUTES.created);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(homePage.getFilterPosts).toHaveText(FILTER_LABEL['/created']);
    await expect(page).toHaveURL(/\/created\/my$/);
  });

  test('VIEW-06d — Payout — My communities renders feed', async ({ page }) => {
    await gotoLoggedIn(page, MY_FEED_ROUTES.payout);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(homePage.getFilterPosts).toHaveText(FILTER_LABEL['/payout']);
    await expect(page).toHaveURL(/\/payout\/my$/);
  });

  test('VIEW-06e — Muted — My communities renders without crashing', async ({ page }) => {
    // /muted/my is community-moderation filtered AND scoped to subs — the
    // intersection is usually empty even when /trending/my has posts.
    // Assert URL + filter chip only.
    await gotoLoggedIn(page, MY_FEED_ROUTES.muted);

    await expect(homePage.getFilterPosts).toHaveText(FILTER_LABEL['/muted'], {
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(page).toHaveURL(/\/muted\/my$/);
  });

  // ── VIEW-06f: `/@user/feed` — My friends (followed users) ──────────────

  test('VIEW-06f — My friends feed renders "no followed users" empty-state', async ({ page }) => {
    await gotoLoggedIn(page, myFriendsUrl());

    // PostsContent wraps its empty state in a stable testid; assert on
    // both the testid (DOM contract) and the rendered copy (translation
    // contract) so a future i18n drift surfaces cleanly.
    await expect(page.getByTestId('user-has-not-started-blogging-yet')).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(page.getByText(EMPTY_FRIENDS_FEED_TEXT)).toBeVisible();

    await expect(page).toHaveURL(new RegExp(`/@${OBSERVER}/feed$`));
  });
});

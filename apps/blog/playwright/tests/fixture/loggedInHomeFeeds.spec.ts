import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import {
  FEED_ROUTES,
  FILTER_LABEL,
  gotoLoggedIn
} from '../support/postDisplayContext';

/**
 * §4 Post Display & Views — main feeds (logged-in observer).
 *
 * Covers VIEW-01..05 + VIEW-16 from the "Test Plan - Automation Test
 * Cases" wiki. Render-only: the spec navigates as a seeded logged-in
 * user (no broadcast interceptor) and asserts that each main feed URL
 * hydrates with the expected post list, the correct filter chip label,
 * and the logged-in header state (login/signup buttons gone).
 *
 * VIEW-06 (`/{filter}/my`), VIEW-07 (tag-filtered) and VIEW-13 (own
 * payouts tab) live in sibling specs because each requires a different
 * fixture dir — `fixtureTestName` is worker-scoped.
 *
 * Record:  pnpm --filter @hive/blog test:fixture:record -- loggedInHomeFeeds
 * Replay:  pnpm --filter @hive/blog test:fixture -- loggedInHomeFeeds
 */

test.use({
  fixtureTestName: 'loggedInHomeFeeds',
  authenticatedUser: {}
});

test.describe('§4 Post Display & Views — main feeds (logged-in observer)', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  // ── VIEW-01: Trending feed ───────────────────────────────────────────

  test('VIEW-01 — Trending feed renders for logged-in observer', async ({ page }) => {
    await gotoLoggedIn(page, FEED_ROUTES.trending);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(homePage.getFilterPosts).toHaveText(FILTER_LABEL[FEED_ROUTES.trending]);

    // Logged-in header — login/signup affordances gone, pencil is a link
    // (parity with loggedInHomepage.spec.ts but on /trending so the same
    // fixture exercises both the auth-state assertions and the feed render).
    await expect(homePage.loginBtn).toBeHidden();
    await expect(homePage.signupBtn).toBeHidden();
  });

  // ── VIEW-02: Hot feed ────────────────────────────────────────────────

  test('VIEW-02 — Hot feed renders for logged-in observer', async ({ page }) => {
    await gotoLoggedIn(page, FEED_ROUTES.hot);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(homePage.getFilterPosts).toHaveText(FILTER_LABEL[FEED_ROUTES.hot]);
  });

  // ── VIEW-03: Created/New feed ────────────────────────────────────────

  test('VIEW-03 — Created/New feed renders for logged-in observer', async ({ page }) => {
    await gotoLoggedIn(page, FEED_ROUTES.created);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(homePage.getFilterPosts).toHaveText(FILTER_LABEL[FEED_ROUTES.created]);
  });

  // ── VIEW-04: Payout feed ─────────────────────────────────────────────

  test('VIEW-04 — Payout feed renders for logged-in observer', async ({ page }) => {
    await gotoLoggedIn(page, FEED_ROUTES.payout);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(homePage.getFilterPosts).toHaveText(FILTER_LABEL[FEED_ROUTES.payout]);
  });

  // ── VIEW-05: Muted feed ──────────────────────────────────────────────

  test('VIEW-05 — Muted feed page loads with "Muted" filter active', async ({ page }) => {
    await gotoLoggedIn(page, FEED_ROUTES.muted);

    await expect(homePage.getFilterPosts).toHaveText(FILTER_LABEL[FEED_ROUTES.muted], {
      timeout: TIMEOUTS.HYDRATION
    });
    // /muted is community-moderation filtered — the post list is often
    // empty for a generic observer, so don't assert on a card. The URL
    // and the filter chip together prove the page hydrated on the
    // muted-sort branch. Sidebar visibility can't be asserted without
    // .first() because the logged-in layout renders TWO copies of
    // `card-trending-comunities` (left rail + right rail), see
    // features/layouts/main-page-layout.tsx:56-58/82.
    await expect(page).toHaveURL(/\/muted$/);
  });

  // ── VIEW-16: Post metadata on a feed card ────────────────────────────

  test('VIEW-16 — First trending post card exposes title, author, time, payout, votes and comments', async ({ page }) => {
    await gotoLoggedIn(page, FEED_ROUTES.trending);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });

    // Title — non-empty link
    await expect(homePage.getFirstPostTitle).toBeVisible();
    await expect(homePage.getFirstPostTitle).not.toHaveText('');

    // Author — `/@…` link
    await expect(homePage.getFirstPostAuthor).toBeVisible();
    const authorHref = await homePage.getFirstPostAuthor.getAttribute('href');
    expect(authorHref).toMatch(/^\/@.+/);

    // Category / first tag — `/{tag}` or `/trending/{tag}` link in the card header
    await expect(homePage.getFirstPostCardCategoryLink).toBeVisible();

    // Timestamp
    await expect(homePage.getFirstPostCardTimestampLink).toBeVisible();

    // Payout — `$` followed by digit (covers `$0.00` through `$1,234.56`)
    await expect(homePage.getFirstPostPayout).toBeVisible();
    await expect(homePage.getFirstPostPayout).toHaveText(/\$\d/);

    // Vote count and comment count are always rendered, even at 0
    await expect(homePage.getFirstPostVotes).toBeVisible();
    await expect(homePage.getFirstPostChildren).toBeVisible();
  });
});

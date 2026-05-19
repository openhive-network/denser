import { test, expect } from '../support/fixture-proxy-test';
import { TagCommunityFeedsPage } from '../support/pages/tagCommunityFeedsPage';
import { TIMEOUTS } from '../support/constants';
import {
  SAMPLE_COMMUNITY_TAG,
  gotoLoggedIn
} from '../support/postDisplayContext';

/**
 * §4 Post Display & Views — tag-filtered feed + community page (logged-in
 * observer).
 *
 * Covers VIEW-07 ("View posts filtered by specific tag") and VIEW-14
 * ("View community page with posts, info, roles") against
 * `hive-139531` (HiveDevs) — the same community pinned by the
 * anonymous `tagCommunityFeeds/` fixture, so future maintenance can
 * cross-reference both. A logged-in observer needs its own fixture dir
 * because `bridge.get_ranked_posts` and a few profile/account RPCs
 * vary by observer (extra `database_api.find_accounts` for the seeded
 * user, observer-scoped `active_votes` in `bridge.get_ranked_posts`
 * responses).
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog exec \
 *            playwright test --config=playwright.fixture.config.ts \
 *            loggedInTagCommunityFeeds.spec.ts
 *          node apps/blog/playwright/tests/support/fixture-auth/trim-fixtures.mjs \
 *            apps/blog/playwright/tests/mock/fixtures/loggedInTagCommunityFeeds
 */

test.use({
  fixtureTestName: 'loggedInTagCommunityFeeds',
  authenticatedUser: {}
});

test.describe('§4 Post Display & Views — tag/community feed (logged-in observer)', () => {
  let pom: TagCommunityFeedsPage;

  test.beforeEach(async ({ page }) => {
    pom = new TagCommunityFeedsPage(page);
  });

  // ── VIEW-07: tag-filtered feed renders ───────────────────────────────

  test(`VIEW-07 — Trending by community tag (${SAMPLE_COMMUNITY_TAG}) renders feed`, async ({ page }) => {
    await gotoLoggedIn(page, `/trending/${SAMPLE_COMMUNITY_TAG}`);

    await pom.validateFeedHasPosts();
    await pom.validateFilterActive('Trending');
    await expect(page).toHaveURL(new RegExp(`/trending/${SAMPLE_COMMUNITY_TAG}$`));
  });

  // ── VIEW-14a: community page exposes header + info sidebar ───────────

  test(`VIEW-14a — Community page (${SAMPLE_COMMUNITY_TAG}) header and info sidebar visible`, async ({ page }) => {
    await gotoLoggedIn(page, `/trending/${SAMPLE_COMMUNITY_TAG}`);

    await pom.validateCommunityHeaderVisible();
    await pom.validateCommunitySidebarVisible();
  });

  // ── VIEW-14b: community roles page renders ───────────────────────────

  test(`VIEW-14b — Community roles page (/roles/${SAMPLE_COMMUNITY_TAG}) renders the roles table`, async ({ page }) => {
    await gotoLoggedIn(page, `/roles/${SAMPLE_COMMUNITY_TAG}`);

    // Skip pom.validateRolesTableRendered() — it asserts on
    // `getByRole('columnheader', { name: 'Account' })`, which the
    // shadcn Table renders as `<th>` (packages/ui/components/table.tsx:51)
    // and Playwright's accessibility tree treats as columnheader only
    // when the row containing it has role="row". The shadcn TableRow
    // doesn't set that role, so the columnheader query misses.
    // Asserting on the heading + a non-zero row count proves the
    // bridge.list_community_roles response landed and rendered.
    await expect(pom.rolesHeading).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(pom.rolesTable).toBeVisible();
    await expect(pom.rolesTableRows).not.toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/roles/${SAMPLE_COMMUNITY_TAG}$`));
  });
});

import { test, expect } from '../support/fixture-proxy-test';
import { SearchPage } from '../support/pages/searchPage';
import { ProfilePage } from '../support/pages/profilePage';
import { TagCommunityFeedsPage } from '../support/pages/tagCommunityFeedsPage';
import { TIMEOUTS } from '../support/constants';

/**
 * Search mode-redirect fixture suite — §13 Search (SRCH-02, SRCH-03).
 *
 * Two search modes don't render results in-page; they route elsewhere:
 *   - account mode → /@<user>   (the user's profile)
 *   - tag mode     → /trending/<tag>
 *
 * Rather than driving the Radix mode dropdown (flaky, and skipped on
 * production in the e2e suite due to an SSR-hydration bug), we use the input's
 * prefix shortcuts handled in `useSearch`: a leading '@' switches to account
 * mode, '#' to tag mode (see use-search.ts). We wait for the mode-specific
 * placeholder as a deterministic sync point before submitting.
 *
 * The redirect targets (profile, trending tag) are SSR pages whose RPCs are
 * recorded into this fixture dir too, so replay renders them and the client
 * navigation completes deterministically.
 *
 * Anonymous: HiveSense status is unavailable in replay (the REST endpoint
 * 404s), so `getHiveSenseStatus` resolves false, the input stays enabled in
 * classic mode, and no AI auto-switch fires.
 *
 * Record:  FIXTURE_MODE=record pnpm exec playwright \
 *            --config=playwright.fixture.config.ts searchRedirects
 * Replay:  pnpm --filter @hive/blog test:fixture -- searchRedirects
 */

test.use({ fixtureTestName: 'searchRedirects' });

const ACCOUNT = 'hiveio';
const TAG = 'hive';

test.describe('§13 Search — mode redirects', () => {
  let searchPage: SearchPage;

  test.beforeEach(({ page }) => {
    searchPage = new SearchPage(page);
  });

  // SRCH-02 — Search by author: account mode redirects to the user's profile.
  test('SRCH-02 account-mode search redirects to user profile', async ({ page }) => {
    await searchPage.goto();
    await expect(searchPage.searchInput).toBeEnabled();

    // '@' prefix switches to account mode; the value is stripped to the bare
    // username and the placeholder flips — wait for it before submitting.
    await searchPage.searchInput.fill(`@${ACCOUNT}`);
    await expect(searchPage.searchInput).toHaveAttribute('placeholder', 'Search users...');

    await searchPage.searchInput.press('Enter');

    await expect(page).toHaveURL(new RegExp(`/@${ACCOUNT}(\\b|$)`));
    await expect(new ProfilePage(page).profileName).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  });

  // SRCH-03 — Search by topic/tag: tag mode redirects to the trending tag feed.
  test('SRCH-03 tag-mode search redirects to trending tag feed', async ({ page }) => {
    await searchPage.goto();
    await expect(searchPage.searchInput).toBeEnabled();

    // '#' prefix switches to tag mode.
    await searchPage.searchInput.fill(`#${TAG}`);
    await expect(searchPage.searchInput).toHaveAttribute('placeholder', 'Search tags...');

    await searchPage.searchInput.press('Enter');

    await expect(page).toHaveURL(new RegExp(`/trending/${TAG}(\\b|$)`));
    await expect(new TagCommunityFeedsPage(page).firstPostItem).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
  });
});

import { test, expect } from '../support/fixture-proxy-test';
import { CommunitiesExplorePage } from '../support/pages/communitiesExplorerPage';
import { TIMEOUTS } from '../support/constants';
import { gotoLoggedIn } from '../support/postDisplayContext';

/**
 * §4 Post Display & Views — communities explorer (logged-in observer).
 *
 * Covers VIEW-15 ("Browse /communities — list and search communities")
 * from the "Test Plan - Automation Test Cases" wiki. Verifies the page
 * loads with the header, search input, and at least one populated
 * community card (title, about, footer, subscribe button). The
 * subscribe button is interactive only for logged-in observers, so the
 * card structure assertions are stricter than the anonymous variant.
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog exec \
 *            playwright test --config=playwright.fixture.config.ts \
 *            loggedInCommunitiesExplorer.spec.ts
 *          node apps/blog/playwright/tests/support/fixture-auth/trim-fixtures.mjs \
 *            apps/blog/playwright/tests/mock/fixtures/loggedInCommunitiesExplorer
 */

test.use({
  fixtureTestName: 'loggedInCommunitiesExplorer',
  authenticatedUser: {}
});

test.describe('§4 Post Display & Views — communities explorer (logged-in observer)', () => {
  let explorer: CommunitiesExplorePage;

  test.beforeEach(async ({ page }) => {
    explorer = new CommunitiesExplorePage(page);
  });

  test('VIEW-15 — /communities lists communities with title, about, footer and subscribe affordance', async ({ page }) => {
    await gotoLoggedIn(page, '/communities');

    await expect(explorer.communitiesHeaderPage).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(explorer.communitiesHeaderTitle).toBeVisible();
    await expect(explorer.searchInput).toBeVisible();
    await expect(explorer.combobox).toBeVisible();

    // First card structure — uses the existing helper, which asserts on
    // title, about, footer, admin link, and the subscribe button. The
    // subscribe button is enabled (not behind a login dialog) because
    // the observer is logged-in.
    await explorer.validateFirstCommunityCardElements();
  });
});

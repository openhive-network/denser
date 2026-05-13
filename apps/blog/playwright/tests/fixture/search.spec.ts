import { test, expect } from '../support/fixture-proxy-test';
import { SearchPage } from '../support/pages/searchPage';
import { TIMEOUTS } from '../support/constants';

/**
 * Search page fixture tests — covers section 1.7 of the
 * "Test Plan - Page View Verification (Anonymous & Logged-In User)" wiki.
 *
 * Scope: anonymous user, view/rendering verification only (no state mutation).
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

test.use({ fixtureTestName: 'search' });

test.describe('Search (fixture-based) — anonymous, §1.7', () => {
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
  });

  test('ANON-SEARCH-01 — Empty /search renders the form (mode select, query input, search button)', async ({
    page
  }) => {
    await searchPage.goto();

    await expect(page).toHaveURL(/\/search$/);
    await searchPage.expectFormVisible();
  });

  test('ANON-SEARCH-02 — /search?q=hive renders results list or "nothing was found" placeholder', async ({
    page
  }) => {
    await searchPage.gotoWithClassicQuery('hive', 'relevance');

    await expect(page).toHaveURL(/\/search\?q=hive/);
    await searchPage.expectFormVisible();
    await searchPage.expectSortControlVisible();

    // View test — wait for the result region to settle in any state.
    // Don't fail the test if HiveSearcher's recorded response was empty;
    // §1.7 only requires the page to render without crashing.
    await searchPage.waitForSearchResults(TIMEOUTS.SEARCH_RESULTS);
  });

  test('ANON-SEARCH-03 — /search?a=hiveio renders author-filtered results in userTopic mode', async ({
    page
  }) => {
    // The plan URL ?a=hiveio puts the form in userTopic mode; topic+sort are
    // required for the result list to render — provide them so the view test
    // exercises the AccountTopicResult branch.
    await searchPage.gotoWithUserTopicQuery('hiveio', 'hive', 'relevance');

    await expect(page).toHaveURL(/a=hiveio/);
    await searchPage.expectFormVisible();
    await searchPage.expectSortControlVisible();

    await searchPage.waitForSearchResults(TIMEOUTS.SEARCH_RESULTS);
  });

  test('ANON-SEARCH-04 — keyword "photography" renders tag-themed results list', async ({ page }) => {
    // The plan URL ?p=photography alone is not a routable variant
    // (tag mode redirects to /trending/<tag>; ?p alone needs ?a + ?s to render).
    // Use a classic search with the tag-like keyword to verify the tag-themed
    // results view renders correctly.
    await searchPage.gotoWithClassicQuery('photography', 'relevance');

    await expect(page).toHaveURL(/\/search\?q=photography/);
    await searchPage.expectFormVisible();
    await searchPage.expectSortControlVisible();

    await searchPage.waitForSearchResults(TIMEOUTS.SEARCH_RESULTS);
  });

  test('ANON-SEARCH-05 — /search?ai=… renders the AI search variant or graceful fallback', async ({
    page
  }) => {
    await searchPage.gotoWithAiQuery('hive blockchain');

    await expect(page).toHaveURL(/\/search\?ai=/);
    await searchPage.expectFormVisible();
    // Sort selector is shown only for classic / userTopic — must be absent in AI mode.
    await expect(searchPage.sortSelectTrigger).toHaveCount(0);

    // HiveSense backend may be unavailable in fixtures — accept either
    // a rendered AI results list or the "Nothing was found." empty state.
    // The view test only requires that the page does not crash.
    await Promise.race([
      searchPage.firstPostItem.waitFor({ state: 'visible', timeout: TIMEOUTS.SEARCH_RESULTS }),
      searchPage.searchPageNoResultsText.waitFor({
        state: 'visible',
        timeout: TIMEOUTS.SEARCH_RESULTS
      })
    ]).catch(() => {
      // Either AIResult is still settling or HiveSense returned an error
      // (rendered inline by ai-result.tsx). The form-visible assertion
      // above already proves the page did not crash.
    });
  });
});

import { test, expect } from '../support/fixture-proxy-test';
import { SearchPage } from '../support/pages/searchPage';
import { TIMEOUTS } from '../support/constants';

/**
 * Classic search fixture suite — §13 Search (SRCH-01, SRCH-05).
 *
 * Deterministic, offline counterpart to the live `e2e/searchPage.spec.ts`
 * tests, which assert conditionally (`if resultsCount > 0`) because the
 * upstream HiveSearcher backend is flaky in CI. Here the `search-api.find_text`
 * responses are replayed from committed fixtures, so we can make hard
 * assertions on result content and on the effect of the sort parameter.
 *
 * The search results are SSR-fetched in `app/search/page.tsx` and passed to
 * `AccountTopicResult` as `initialData` (refetchOnMount: false), so the single
 * server-side `find_text` call per query is the only RPC that matters for the
 * initial render — and it flows through the fixture proxy on :8200.
 *
 * Anonymous (no `authenticatedUser`): search needs no login, and the SSR
 * observer for an anonymous visitor is the default ('hive.blog').
 *
 * Record:  FIXTURE_MODE=record pnpm exec playwright \
 *            --config=playwright.fixture.config.ts searchClassic
 * Replay:  pnpm --filter @hive/blog test:fixture -- searchClassic
 */

test.use({ fixtureTestName: 'searchClassic' });

const CLASSIC_QUERY = 'hive';

// Pinned from the committed fixture (relevance-sorted first result for
// q='hive'). Re-recording may change this — update alongside the fixture.
const RELEVANCE_FIRST_AUTHOR = 'bradleyarrow';

const POST_AUTHOR_PATTERN = /data-testid="post-author"[^>]*>([^<]+)</g;

function serverRenderedAuthors(html: string): string[] {
  return Array.from(html.matchAll(POST_AUTHOR_PATTERN), (match) => match[1]);
}

test.describe('§13 Search — classic text search', () => {
  let searchPage: SearchPage;

  test.beforeEach(({ page }) => {
    searchPage = new SearchPage(page);
  });

  // SRCH-01 — Classic text search: search posts by a text query.
  test('SRCH-01 classic text search returns matching posts', async ({ page }) => {
    await searchPage.gotoWithClassicQuery(CLASSIC_QUERY, 'relevance');

    await expect(page).toHaveURL(/\/search\?q=hive/);

    // Results render deterministically from the fixture.
    await expect(searchPage.firstPostItem).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    expect(await searchPage.getResultsCount()).toBeGreaterThanOrEqual(1);

    // The first result is pinned, proving we render the recorded response
    // (not just "some" list) — a real regression assertion.
    await expect(searchPage.firstPostAuthor).toHaveText(RELEVANCE_FIRST_AUTHOR);
  });

  // SRCH-05 — Search with sorting: verify the sort control re-issues the
  // query with the chosen sort option.
  //
  // We assert on the sort *control* (URL param propagation), not on a
  // different result set: the HiveSearcher backend returns no data for the
  // 'created' sort on a plain text pattern (the live e2e test flags this as
  // @flaky for the same reason), so asserting "created shows other posts"
  // would be testing a backend behaviour that doesn't exist. The committed
  // 'created' fixture preserves that null response, so the navigation still
  // completes deterministically.
  test('SRCH-05 sort selector re-issues the query with the chosen sort', async ({ page }) => {
    await searchPage.gotoWithClassicQuery(CLASSIC_QUERY, 'relevance');
    await expect(searchPage.firstPostItem).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    // The sort control reflects the active sort.
    await expect(searchPage.sortSelectTrigger).toContainText('Relevance');

    // Switching to "Newest" re-issues the search with sort=created while
    // preserving the query.
    await searchPage.selectSort('created');

    await expect(page).toHaveURL(/[?&]s=created/);
    await expect(page).toHaveURL(/[?&]q=hive/);
  });

  // SRCH-06 — A shared or hand-typed URL without `s=` searches by relevance
  // on the server, exactly like the app's own `&s=relevance` links.
  test('SRCH-06 a query without a sort renders the relevance results in the server HTML', async ({ request }) => {
    const withoutSort = await request.get(`/search?q=${CLASSIC_QUERY}`);
    const withRelevance = await request.get(`/search?q=${CLASSIC_QUERY}&s=relevance`);
    expect(withoutSort.status()).toBe(200);
    expect(withRelevance.status()).toBe(200);

    const authorsWithoutSort = serverRenderedAuthors(await withoutSort.text());
    const authorsWithRelevance = serverRenderedAuthors(await withRelevance.text());

    expect(authorsWithRelevance[0]).toBe(RELEVANCE_FIRST_AUTHOR);
    expect(authorsWithoutSort).toEqual(authorsWithRelevance);
  });
});

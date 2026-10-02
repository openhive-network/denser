import { test, expect } from '../support/fixture-proxy-test';
import { SearchPage } from '../support/pages/searchPage';
import { TIMEOUTS } from '../support/constants';
import { recordWasmRequests, settleAfterLoad } from '../support/wasmRequests';

/**
 * A logged-out reader searching never downloads wax's wasm (the search page also probes the
 * hivesense API to decide whether AI search is available).
 */

test.use({ fixtureTestName: 'searchClassic' });

test('ANON-WASM-04: text search requests no .wasm', async ({ page }) => {
  const wasmRequests = recordWasmRequests(page);
  const searchPage = new SearchPage(page);

  await searchPage.gotoWithClassicQuery('hive', 'relevance');
  await expect(searchPage.firstPostItem).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await settleAfterLoad(page);

  expect(wasmRequests).toEqual([]);
});

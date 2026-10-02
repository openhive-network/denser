import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';
import { recordWasmRequests, settleAfterLoad } from '../support/wasmRequests';

/**
 * A logged-out reader of a post never downloads wax's wasm: not for the post, its comments and
 * hivesense suggestions, nor for the author popover card (account, follow counts, Hive Power).
 */

test.use({ fixtureTestName: 'postDetail_popover' });

test('ANON-WASM-02: a post page and the author popover card request no .wasm', async ({ page }) => {
  const wasmRequests = recordWasmRequests(page);

  await page.goto('/hive-160391/@gtg/hive-hardfork-25-jump-starter-kit');
  await expect(page.getByTestId('article-title')).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await settleAfterLoad(page);

  await page.getByTestId('author-name-link').first().click();
  await expect(page.getByTestId('user-popover-card-content')).toBeVisible();
  await page.waitForLoadState('networkidle');

  expect(wasmRequests).toEqual([]);
});

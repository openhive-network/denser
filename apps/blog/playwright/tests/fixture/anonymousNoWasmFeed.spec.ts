import type { Request } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { TIMEOUTS } from '../support/constants';
import { recordWasmRequests, settleAfterLoad } from '../support/wasmRequests';

/**
 * A logged-out reader of a feed never downloads wax's wasm: not during load, not after the page
 * goes idle, and not while infinite scroll loads the next page.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const isNextFeedPageRead = (request: Request): boolean => {
  if (request.method() !== 'POST') return false;
  const body = request.postData() ?? '';
  return body.includes('"bridge.get_ranked_posts"') && !body.includes('"start_author":""');
};

test('ANON-WASM-01: /trending and its infinite scroll request no .wasm', async ({ page }) => {
  const wasmRequests = recordWasmRequests(page);
  // The recording has only the first page; answer the next-page read with the end of the feed.
  await page.route('**/*', (route) =>
    isNextFeedPageRead(route.request())
      ? route.fulfill({ json: { jsonrpc: '2.0', id: 1, result: [] } })
      : route.fallback()
  );

  await page.goto('/trending');
  await expect(page.getByTestId('post-list-item').first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await settleAfterLoad(page);

  const nextPageRead = page.waitForRequest(isNextFeedPageRead);
  await page.getByTestId('post-list-item').last().scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 100_000);
  await nextPageRead;
  await page.waitForLoadState('networkidle');

  expect(wasmRequests).toEqual([]);
});

import type { Page } from '@playwright/test';
import { testTimeout } from '../../../../../playwright/support/timeouts';

/**
 * Helpers for asserting which pages download wax's wasm (`wax.common.<hash>.wasm`).
 *
 * Readers must never request it, logged in or not: reads go through the wasm-free read client, and
 * the chain is created on the first action that signs.
 */

export const WASM_URL = /\.wasm(\?|$)/;

/**
 * Records every `.wasm` request made in `page`'s browser context; returns the (live) list of their
 * URLs. A context listener, not `page.route`: it also sees requests that routing does not reach.
 */
export const recordWasmRequests = (page: Page): string[] => {
  const wasmRequests: string[] = [];
  page.context().on('request', (request) => {
    if (WASM_URL.test(request.url())) wasmRequests.push(request.url());
  });
  return wasmRequests;
};

/**
 * Waits until the page has loaded and gone idle, and its network has settled, so that work deferred
 * to idle time has started.
 */
export const settleAfterLoad = async (page: Page): Promise<void> => {
  await page.waitForLoadState('load');
  await page.evaluate(
    (timeout) => new Promise<void>((resolve) => window.requestIdleCallback(() => resolve(), { timeout })),
    testTimeout('idle-callback', 5_000)
  );
  await page.waitForLoadState('networkidle');
};

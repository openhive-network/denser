import type { Page } from '@playwright/test';

/** Wax's wasm (`wax.common.<hash>.wasm`): logged-out wallet pages paint without it. */
const WASM_URL = /\.wasm(\?|$)/;

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

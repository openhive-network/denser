import type { Page } from '@playwright/test';
import { expect } from './fixture-proxy-test';
import { TIMEOUTS } from './constants';
import { SIGNING_STACK_MARKERS, findMarkersInInitialChunks, withoutChunkPaths } from './initialChunks';
import { recordWasmRequests, settleAfterLoad } from './wasmRequests';

/**
 * Helpers for asserting when a logged-in page loads the signing stack: wax (its JavaScript and
 * wasm), beekeeper / hb-auth and the signers. Being logged in must not load it; the first action
 * that signs does.
 */

/**
 * Records every script the page's browser context receives; returns the `"<url>: <marker>"` of
 * each signing-stack marker found in them so far. Unlike `findMarkersInInitialChunks` this also
 * sees chunks loaded later through a dynamic `import()`.
 */
export const recordSigningStackScripts = (page: Page): (() => Promise<string[]>) => {
  const scripts: Promise<string[]>[] = [];
  page.context().on('response', (response) => {
    if (response.request().resourceType() !== 'script') return;
    scripts.push(
      response
        .text()
        // A redirect or a response the browser dropped has no body.
        .catch(() => '')
        .then(withoutChunkPaths)
        .then((code) => SIGNING_STACK_MARKERS.filter((marker) => code.includes(marker)).map((marker) => `${response.url()}: ${marker}`))
    );
  });
  return async () => (await Promise.all(scripts)).flat();
};

/**
 * Opens `path` as the seeded logged-in user and waits until it has hydrated as logged in and gone
 * idle; asserts that neither the chunks its HTML references nor anything it loaded since carries
 * the signing stack, and that it requested no wasm.
 */
export const expectNoSigningStackOnLoggedInLoad = async (page: Page, path: string): Promise<void> => {
  const wasmRequests = recordWasmRequests(page);
  const signingStackScripts = recordSigningStackScripts(page);

  await page.goto(path);
  await expect(page.getByTestId('login-btn')).toBeHidden({ timeout: TIMEOUTS.HYDRATION });
  await expect(page.getByTestId('nav-pencil')).toBeVisible();
  await settleAfterLoad(page);

  expect(wasmRequests).toEqual([]);
  expect(await signingStackScripts()).toEqual([]);
  // The page's own request context carries the login cookies, so the server renders the logged-in HTML.
  expect(await findMarkersInInitialChunks(page.context().request, path, SIGNING_STACK_MARKERS)).toEqual([]);
};

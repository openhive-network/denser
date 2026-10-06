import { test, expect } from '@playwright/test';
import { SIGNING_STACK_MARKERS, findMarkersInInitialChunks } from '../support/initialChunks';

/**
 * Initial JS chunks of the wallet.
 *
 * Every chunk the server HTML references is fetched before the page loads, so none of them may
 * carry wax's JavaScript or hb-auth's beekeeper: reads go through the wax-free read client,
 * transactions through the lazy transaction service, and signing, login and what renders with wax
 * (the account history formatter) are loaded through dynamic import()s. A static import of wax,
 * the signers or `@transaction/index` from page-load code pulls them back.
 *
 * Reads the server HTML only. The server's API endpoint is unreachable
 * (playwright.fixture.config.ts), so the page renders without account data.
 */

test.describe('Initial JS chunks', () => {
  test('WALLET-PERF-CHUNKS-01 — no chunk referenced from the /@gtg/transfers HTML contains wax or beekeeper', async ({
    request
  }) => {
    expect(await findMarkersInInitialChunks(request, '/@gtg/transfers', SIGNING_STACK_MARKERS)).toEqual([]);
  });
});

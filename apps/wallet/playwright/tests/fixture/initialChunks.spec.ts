import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { SENTRY_MARKERS, SIGNING_STACK_MARKERS, findMarkersInInitialChunks } from '../support/initialChunks';

/**
 * Initial JS chunks of the wallet.
 *
 * Every chunk the server HTML references is fetched before the page loads, so none of them may
 * carry wax's JavaScript or hb-auth's beekeeper: reads go through the wax-free read client,
 * transactions through the lazy transaction service, and signing, login and what renders with wax
 * (the account history formatter) are loaded through dynamic import()s. A static import of wax,
 * the signers or `@transaction/index` from page-load code pulls them back.
 *
 * Nor may they carry the Sentry SDK, which instrumentation-client.ts loads through a dynamic
 * import() only when a DSN is configured.
 *
 * Reads the server HTML only. The server's API endpoint is unreachable
 * (playwright.fixture.config.ts), so the page renders without account data.
 */

test.describe('Initial JS chunks', () => {
  test('WALLET-PERF-CHUNKS-01 — no chunk referenced from the /@gtg/transfers HTML contains Sentry, wax or beekeeper', async ({
    request
  }) => {
    expect(
      await findMarkersInInitialChunks(request, `${WALLET_BASE_PATH}/@gtg/transfers`, [...SENTRY_MARKERS, ...SIGNING_STACK_MARKERS])
    ).toEqual([]);
  });

  test('WALLET-PERF-CHUNKS-02 — no chunk referenced from the home page HTML contains Sentry', async ({ request }) => {
    expect(await findMarkersInInitialChunks(request, `${WALLET_BASE_PATH}/`, SENTRY_MARKERS)).toEqual([]);
  });
});

import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { STUB_WITNESSES } from '../support/witnessApiStub';
import {
  STUB_ACCOUNT,
  STUB_DELEGATEE,
  STUB_PROPOSAL_SUBJECT,
  STUB_TRANSFER_SENDER,
  startWalletApiStub
} from '../support/walletApiStub';
import { WASM_URL, recordWasmRequests } from '../support/wasmRequests';

/**
 * A logged-out visitor of the wallet's read-only pages never waits for wax's wasm: the pages read
 * through the wasm-free read client and compute and format assets in plain TypeScript. Market,
 * proposals, witnesses and delegations never request it; the transfers page paints its balances
 * while it is still loading, for the account history formatter it loads afterwards. The API
 * answers come from the stub node (support/walletApiStub.ts).
 */

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// The pages read from the stub on 127.0.0.1, but on a host without a network (`docker run --network
// none`) Chromium reports navigator.onLine === false and React Query pauses every query, so nothing
// reaches the stub. Report online, as the blog's fixture-proxy-test does.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

test.describe('Logged-out wallet pages without wasm', () => {
  test('WALLET-ANON-WASM-01 — /market renders its statistics and requests no .wasm', async ({ page }) => {
    const wasmRequests = recordWasmRequests(page);

    await page.goto(`${WALLET_BASE_PATH}/market`);
    await expect(page.getByTestId('market-last-price-value')).toContainText('0.250000');
    await page.waitForLoadState('networkidle');

    expect(wasmRequests).toEqual([]);
  });

  test('WALLET-ANON-WASM-02 — /proposals renders its proposals and requests no .wasm', async ({ page }) => {
    const wasmRequests = recordWasmRequests(page);

    await page.goto(`${WALLET_BASE_PATH}/proposals`);
    await expect(page.getByTestId('proposal-title')).toContainText(STUB_PROPOSAL_SUBJECT);
    await page.waitForLoadState('networkidle');

    expect(wasmRequests).toEqual([]);
  });

  test('WALLET-ANON-WASM-03 — /~witnesses renders its witnesses and requests no .wasm', async ({ page }) => {
    const wasmRequests = recordWasmRequests(page);

    await page.goto(`${WALLET_BASE_PATH}/~witnesses`);
    await expect(page.getByTestId('witness-name-link')).toHaveText(STUB_WITNESSES.map(({ owner }) => owner));
    await page.waitForLoadState('networkidle');

    expect(wasmRequests).toEqual([]);
  });

  test('WALLET-ANON-WASM-04 — /@gtg/delegations renders its delegations and requests no .wasm', async ({ page }) => {
    const wasmRequests = recordWasmRequests(page);

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/delegations`);
    await expect(page.getByTestId('wallet-delegation-item')).toContainText(STUB_DELEGATEE);
    await expect(page.getByTestId('wallet-delegation-item')).toContainText('0.900 HP');
    await page.waitForLoadState('networkidle');

    expect(wasmRequests).toEqual([]);
  });

  test('WALLET-ANON-WASM-05 — /@gtg/transfers paints its balances before the .wasm loads, then formats the history', async ({
    page
  }) => {
    let releaseWasm = () => {};
    const wasmReleased = new Promise<void>((resolve) => (releaseWasm = resolve));
    const finishedWasmRequests: string[] = [];
    page.on('requestfinished', (request) => {
      if (WASM_URL.test(request.url())) finishedWasmRequests.push(request.url());
    });
    await page.route(WASM_URL, async (route) => {
      await wasmReleased;
      await route.continue();
    });

    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
    await expect(page.getByTestId('wallet-hive-value')).toContainText('1,234.567 HIVE');
    await expect(page.getByTestId('wallet-hive-power')).toContainText('900.000');
    expect(finishedWasmRequests).toEqual([]);

    releaseWasm();
    await expect(page.getByTestId('wallet-account-history-row')).toContainText(
      `Received 1.000 HIVE from ${STUB_TRANSFER_SENDER}`
    );
  });
});

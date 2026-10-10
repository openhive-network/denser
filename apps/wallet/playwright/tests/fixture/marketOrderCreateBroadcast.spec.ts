import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectLimitOrderCreateOperation, naiAsset } from '../support/walletOperations';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub, storeStubAccountKey } from '../support/walletApiStub';

/**
 * Placing a buy or sell order from the market page signs and broadcasts one
 * `limit_order_create_operation` built from the form. Reads come from the stub node
 * (support/walletApiStub.ts: lowest ask 0.251, highest bid 0.249); the broadcast and
 * `verify_authority` are answered by the interceptor. The page's clock is fixed, as the order id
 * and expiration derive from it.
 */

const HYDRATION_TIMEOUT = 30_000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

const NOW = new Date('2026-10-01T12:00:00Z');
/** The form's order id: the current Unix time in seconds. */
const ORDER_ID = NOW.getTime() / 1000;
/** The form's expiration: 27 days on. */
const EXPIRATION = '2026-10-28T12:00:00';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
  await page.clock.setFixedTime(NOW);
});

/**
 * Opens /market signed in and types `amount` into the `form`'s HIVE amount until the form, once
 * hydrated, computes the HBD total `expectedTotal` from it.
 */
const fillMarketForm = async (page: Page, form: 'buy-form' | 'sell-form', amount: string, expectedTotal: string) => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/market`);

  const amountInput = page.getByTestId(`${form}-amount-input`);
  const totalInput = page.getByTestId(`${form}-total-input`);
  await expect(async () => {
    await amountInput.fill(amount);
    await expect(totalInput).toHaveValue(expectedTotal, { timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
};

const confirmOrder = async (page: Page, form: 'buy-form' | 'sell-form') => {
  await page.getByTestId(`${form}-submit-button`).click();
  await page.getByTestId(`${form}-dialog-ok`).click();
};

test.describe('Market limit order create broadcast', () => {
  test('WALLET-TX-ORDER-CREATE-01 — a buy order sells the HBD total for at least the HIVE amount', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await fillMarketForm(page, 'buy-form', '10', '2.510');
    await expect(page.getByTestId('buy-form-price-input')).toHaveValue('0.251000');
    await confirmOrder(page, 'buy-form');

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectLimitOrderCreateOperation(broadcasts.calls[0], {
      owner: STUB_ACCOUNT,
      orderid: ORDER_ID,
      amount_to_sell: naiAsset('2.510 HBD'),
      min_to_receive: naiAsset('10.000 HIVE'),
      fill_or_kill: false,
      expiration: EXPIRATION
    });
  });

  test('WALLET-TX-ORDER-CREATE-02 — a sell order sells the HIVE amount for at least the HBD total', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await fillMarketForm(page, 'sell-form', '100.5', '25.025');
    await expect(page.getByTestId('sell-form-price-input')).toHaveValue('0.249000');
    await confirmOrder(page, 'sell-form');

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectLimitOrderCreateOperation(broadcasts.calls[0], {
      owner: STUB_ACCOUNT,
      orderid: ORDER_ID,
      amount_to_sell: naiAsset('100.500 HIVE'),
      min_to_receive: naiAsset('25.025 HBD'),
      fill_or_kill: false,
      expiration: EXPIRATION
    });
  });

  test('WALLET-TX-ORDER-CREATE-03 — an amount finer than 0.001 HIVE is rejected and nothing is broadcast', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await fillMarketForm(page, 'buy-form', '1.2345', '0.310');

    const rejected = page.waitForEvent('pageerror', {
      predicate: (error) => error.message.includes('maximum of 3 decimal places in HIVE amount')
    });
    await confirmOrder(page, 'buy-form');
    await rejected;

    await expect(page.getByTestId('buy-form-dialog')).toBeVisible();
    expect(broadcasts.calls).toHaveLength(0);
  });
});

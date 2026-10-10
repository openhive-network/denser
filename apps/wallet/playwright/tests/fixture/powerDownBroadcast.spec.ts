import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectWithdrawVestingOperation, naiAsset } from '../support/walletOperations';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub, storeStubAccountKey } from '../support/walletApiStub';

/**
 * Power down from the HIVE POWER balance menu signs and broadcasts one
 * `withdraw_vesting_operation` of the VESTS the HP amount is worth at the stub's vesting fund
 * (180,000,000.000 HIVE for 330,000,000,000.000000 VESTS: 3 HP is 5,500 VESTS); an amount with
 * more than HIVE's 3 decimals broadcasts nothing. Reads come from the stub node
 * (support/walletApiStub.ts); the broadcast and `verify_authority` are answered by the
 * interceptor, so the key signing it belongs to no account.
 */

const HYDRATION_TIMEOUT = 30_000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub();
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

/** Opens the Power Down dialog of STUB_ACCOUNT's transfers page, logged in with its active key. */
const openPowerDownDialog = async (page: Page) => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

  const menuTrigger = page.getByTestId('wallet-hive-power').getByRole('button');
  const menu = page.getByRole('menu');
  await expect(async () => {
    await menuTrigger.click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await menu.getByText('Power Down', { exact: true }).click();
  return page.getByRole('dialog', { name: 'Power Down', exact: true });
};

test.describe('Power down broadcast', () => {
  test('WALLET-TX-POWERDOWN-01 — powering down broadcasts the account and the VESTS of the HP amount', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openPowerDownDialog(page);

    await dialog.getByPlaceholder('Amount').fill('3');
    await dialog.getByRole('button', { name: 'Power Down', exact: true }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectWithdrawVestingOperation(broadcasts.calls[0], {
      account: STUB_ACCOUNT,
      vesting_shares: naiAsset('5500.000000 VESTS')
    });
  });

  test('WALLET-TX-POWERDOWN-02 — an amount finer than 0.001 HP is refused and broadcasts nothing', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openPowerDownDialog(page);

    await dialog.getByPlaceholder('Amount').fill('1.2345');
    // The dialog shows no error for it: the refusal surfaces only as the page's rejected promise.
    const refusal = page.waitForEvent('pageerror', (error) => /maximum of 3 decimal places/.test(error.message));
    await dialog.getByRole('button', { name: 'Power Down', exact: true }).click();

    await refusal;
    await expect(dialog).toBeVisible();
    expect(broadcasts.calls).toHaveLength(0);
  });
});

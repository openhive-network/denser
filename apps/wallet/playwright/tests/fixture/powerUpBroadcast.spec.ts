import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectTransferToVestingOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';

/**
 * Power up from the HIVE balance menu signs and broadcasts one `transfer_to_vesting_operation`
 * with what the dialog was given, to the account itself unless another one is chosen under
 * Advanced; an amount above the HIVE balance (1,234.567 HIVE in the stub) broadcasts nothing.
 * Reads come from the stub node (support/walletApiStub.ts); the broadcast and `verify_authority`
 * are answered by the interceptor, so the key signing it belongs to no account.
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

/** Opens the Power Up dialog of STUB_ACCOUNT's transfers page, logged in with its active key. */
const openPowerUpDialog = async (page: Page) => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

  const menuTrigger = page.getByTestId('wallet-hive-value').getByRole('button');
  const menu = page.getByRole('menu');
  await expect(async () => {
    await menuTrigger.click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await menu.getByText('Power up', { exact: true }).click();
  return page.getByRole('dialog', { name: 'Power Up', exact: true });
};

const confirmPowerUp = (page: Page) =>
  page.getByRole('dialog', { name: 'Confirm Power Up' }).getByRole('button', { name: 'OK' }).click();

test.describe('Power up broadcast', () => {
  test('WALLET-TX-POWERUP-01 — powering up broadcasts the HIVE amount from and to the account itself', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openPowerUpDialog(page);

    await dialog.getByPlaceholder('Amount').fill('3');
    await dialog.getByRole('button', { name: 'Power Up', exact: true }).click();
    await confirmPowerUp(page);

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferToVestingOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_ACCOUNT,
      amount: naiAsset('3.000 HIVE')
    });
  });

  test('WALLET-TX-POWERUP-02 — powering up another account broadcasts it as the recipient', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openPowerUpDialog(page);

    await dialog.getByRole('button', { name: 'Advanced' }).click();
    await dialog.locator('input[cmdk-input]').fill('stub-f');
    await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` }).click();
    await dialog.getByPlaceholder('Amount').fill('2.5');
    await dialog.getByRole('button', { name: 'Power Up', exact: true }).click();
    await confirmPowerUp(page);

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferToVestingOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_FOLLOWED,
      amount: naiAsset('2.500 HIVE')
    });
  });

  test('WALLET-TX-POWERUP-03 — an amount above the HIVE balance is refused and broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openPowerUpDialog(page);

    await dialog.getByPlaceholder('Amount').fill('1234.568');
    await dialog.getByRole('button', { name: 'Power Up', exact: true }).click();

    await expect(dialog.getByText('Insufficient funds.')).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Confirm Power Up' })).toHaveCount(0);
    expect(broadcasts.calls).toHaveLength(0);
  });
});

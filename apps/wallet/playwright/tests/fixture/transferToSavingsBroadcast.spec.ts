import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectTransferToSavingsOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';

/**
 * "Transfer to savings" from a balance menu broadcasts one `transfer_to_savings_operation` into the
 * owner's own savings (the dialog's basic mode), with no memo, in the currency of the balance it
 * was opened from. Reads come from the stub node (support/walletApiStub.ts: 1,234.567 HIVE and
 * $2.500 HBD); the broadcast is answered by the interceptor.
 */

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

const openTransferToSavingsDialog = async (page: Page, balanceTestId: string): Promise<Locator> => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
  return openBalanceMenuDialog(
    page,
    page.getByTestId(balanceTestId).getByRole('button'),
    'Transfer to savings',
    'Transfer To Savings'
  );
};

const submitAmount = async (dialog: Locator, amount: string) => {
  await dialog.getByPlaceholder('Amount').fill(amount);
  await dialog.getByRole('button', { name: 'Next' }).click();
};

const confirmDialog = (page: Page) => page.getByRole('dialog', { name: 'Confirm Transfer To Savings' });

test.describe('Transfer to savings broadcast', () => {
  test('WALLET-TX-SAVINGS-IN-01 — HIVE goes into the owner\'s own savings', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferToSavingsDialog(page, 'wallet-hive-value');
    await submitAmount(dialog, '100.001');
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferToSavingsOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_ACCOUNT,
      amount: naiAsset('100.001 HIVE'),
      memo: ''
    });
  });

  test('WALLET-TX-SAVINGS-IN-02 — from the HBD balance the amount is HBD', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferToSavingsDialog(page, 'wallet-hive-dallars-value');
    await submitAmount(dialog, '1.75');
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferToSavingsOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_ACCOUNT,
      amount: naiAsset('1.750 HBD'),
      memo: ''
    });
  });

  test('WALLET-TX-SAVINGS-IN-03 — an amount finer than 0.001 is refused and broadcasts nothing', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferToSavingsDialog(page, 'wallet-hive-value');
    await submitAmount(dialog, '1.2345');

    await expect(dialog.getByText('Use only 3 digits of precision')).toBeVisible();
    await expect(confirmDialog(page)).toBeHidden();
    expect(broadcasts.calls).toHaveLength(0);
  });
});

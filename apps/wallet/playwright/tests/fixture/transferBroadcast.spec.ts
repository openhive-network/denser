import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectTransferOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';

/**
 * A transfer from a balance menu signs and broadcasts one `transfer_operation` with what the
 * dialog was given, in the currency of the balance it was opened from. Reads come from the stub
 * node (support/walletApiStub.ts: 1,234.567 HIVE and $2.500 HBD); the broadcast and
 * `verify_authority` are answered by the interceptor, so the key signing it belongs to no account.
 */

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

const MEMO = 'thanks for the coffee';
const HBD_MEMO = 'rent for October';

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

/** Logs in with an active key and opens the transfer dialog of the balance at `balanceTestId`. */
const openTransferDialog = async (page: Page, balanceTestId: string): Promise<Locator> => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
  return openBalanceMenuDialog(
    page,
    page.getByTestId(balanceTestId).getByRole('button'),
    'Transfer',
    'Transfer To Account'
  );
};

const fillTransfer = async (dialog: Locator, amount: string, memo: string) => {
  const recipient = dialog.locator('input[cmdk-input]');
  await recipient.fill('stub-f');
  await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` }).click();
  await dialog.getByPlaceholder('Amount').fill(amount);
  await dialog.getByPlaceholder('Memo').fill(memo);
  await dialog.getByRole('button', { name: 'Next' }).click();
};

const confirmDialog = (page: Page) => page.getByRole('dialog', { name: 'Confirm Transfer To Account' });

test.describe('Transfer broadcast', () => {
  test('WALLET-TX-TRANSFER-01 — confirming a transfer broadcasts its from, to, amount and memo', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-value');
    await fillTransfer(dialog, '1.5', MEMO);
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_FOLLOWED,
      amount: naiAsset('1.500 HIVE'),
      memo: MEMO
    });
  });

  test('WALLET-TX-TRANSFER-02 — a transfer from the HBD balance broadcasts an HBD amount', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-dallars-value');
    await fillTransfer(dialog, '2.125', HBD_MEMO);
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_FOLLOWED,
      amount: naiAsset('2.125 HBD'),
      memo: HBD_MEMO
    });
  });

  test('WALLET-TX-TRANSFER-03 — an amount below 1 is broadcast in its canonical NAI form', async ({ page }) => {
    test.fail(
      true,
      "@transaction getAsset builds the satoshi string from toFixed() with the dot removed, so 0.250 HIVE is sent as amount '0250'"
    );
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-value');
    await fillTransfer(dialog, '0.25', MEMO);
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expectTransferOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_FOLLOWED,
      amount: naiAsset('0.250 HIVE'),
      memo: MEMO
    });
  });

  test('WALLET-TX-TRANSFER-04 — an amount above the balance is refused and broadcasts nothing', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openTransferDialog(page, 'wallet-hive-dallars-value');
    await fillTransfer(dialog, '2.501', HBD_MEMO);

    await expect(dialog.getByText('Insufficient funds.')).toBeVisible();
    await expect(confirmDialog(page)).toBeHidden();
    expect(broadcasts.calls).toHaveLength(0);
  });
});

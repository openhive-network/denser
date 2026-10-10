import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
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
 * A transfer from the HIVE balance menu signs and broadcasts one `transfer_operation` with what
 * the dialog was given. Reads come from the stub node (support/walletApiStub.ts); the broadcast
 * and `verify_authority` are answered by the interceptor, so the key signing it belongs to no
 * account.
 */

const HYDRATION_TIMEOUT = 30_000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

const MEMO = 'thanks for the coffee';

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

test.describe('Transfer broadcast', () => {
  test('WALLET-TX-TRANSFER-01 — confirming a transfer broadcasts its from, to, amount and memo', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await logInAsStubAccount(page, 'active');
    await storeStubAccountKey(page, 'active', ACTIVE_WIF);
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

    const menuTrigger = page.getByTestId('wallet-hive-value').getByRole('button');
    const menu = page.getByRole('menu');
    await expect(async () => {
      await menuTrigger.click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: HYDRATION_TIMEOUT });
    await menu.getByText('Transfer', { exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Transfer To Account', exact: true });
    const recipient = dialog.locator('input[cmdk-input]');
    await recipient.fill('stub-f');
    await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` }).click();
    await dialog.getByPlaceholder('Amount').fill('1.5');
    await dialog.getByPlaceholder('Memo').fill(MEMO);
    await dialog.getByRole('button', { name: 'Next' }).click();

    const confirm = page.getByRole('dialog', { name: 'Confirm Transfer To Account' });
    await confirm.getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_FOLLOWED,
      amount: naiAsset('1.500 HIVE'),
      memo: MEMO
    });
  });
});

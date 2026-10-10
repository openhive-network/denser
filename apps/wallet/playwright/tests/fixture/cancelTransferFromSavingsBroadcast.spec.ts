import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectCancelTransferFromSavingsOperation } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';

/**
 * Cancelling a pending savings withdrawal broadcasts one `cancel_transfer_from_savings_operation`
 * naming the owner and that withdrawal's request id. Reads come from the stub node
 * (support/walletApiStub.ts), here with one pending withdrawal; the broadcast is answered by the
 * interceptor.
 */

const HYDRATION_TIMEOUT = 30_000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

const REQUEST_ID = 1_759_312_345;
const WITHDRAW_MESSAGE = `Withdraw 1.250 HBD to ${STUB_ACCOUNT}`;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, {
    'database_api.find_savings_withdrawals': () => ({
      withdrawals: [
        {
          id: 11,
          from: STUB_ACCOUNT,
          to: STUB_ACCOUNT,
          memo: '',
          request_id: REQUEST_ID,
          amount: { amount: '1250', precision: 3, nai: '@@000000013' },
          complete: '2026-10-04T12:00:00'
        }
      ]
    })
  });
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

/** Opens the cancel prompt of the pending withdrawal, retried until hydration attached the handlers. */
const openCancelDialog = async (page: Page): Promise<Locator> => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

  const cancel = page.getByRole('row').filter({ hasText: WITHDRAW_MESSAGE }).getByRole('button', { name: 'Cancel' });
  const dialog = page.getByRole('dialog').filter({ hasText: 'Cancel this withdraw request?' });
  await expect(async () => {
    await cancel.click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await expect(dialog).toContainText(WITHDRAW_MESSAGE);
  return dialog;
};

test.describe('Cancel transfer from savings broadcast', () => {
  test('WALLET-TX-SAVINGS-CANCEL-01 — cancelling a pending withdrawal broadcasts its request id', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openCancelDialog(page);
    await dialog.getByRole('button', { name: 'Cancel withdraw from savings' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectCancelTransferFromSavingsOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      request_id: REQUEST_ID
    });
  });

  test('WALLET-TX-SAVINGS-CANCEL-02 — dismissing the prompt broadcasts nothing', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openCancelDialog(page);
    await page.keyboard.press('Escape');

    await expect(dialog).toBeHidden();
    await expect(page.getByRole('row').filter({ hasText: WITHDRAW_MESSAGE })).toBeVisible();
    expect(broadcasts.calls).toHaveLength(0);
  });
});

import type { Server } from 'node:http';
import { test, expect, type Locator, type Page } from '@playwright/test';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectTransferFromSavingsOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  fullAccount,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';

/**
 * "Withdraw HIVE" / "Withdraw HIVE DOLLARS" from the savings balance menus broadcasts one
 * `transfer_from_savings_operation` back to the owner (the dialog's basic mode), with no memo and
 * a request id of the current Unix time in seconds, fixed here by the page clock. Reads come from
 * the stub node (support/walletApiStub.ts), here with 4.321 HIVE and $1.250 HBD in savings; the
 * broadcast is answered by the interceptor.
 */

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

const NOW = new Date('2026-10-01T12:00:00Z');
const REQUEST_ID = NOW.getTime() / 1000;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, {
    'database_api.find_accounts': ({ accounts = [] }) => ({
      accounts: accounts.map((name) =>
        fullAccount({
          name,
          posting_json_metadata: '',
          json_metadata: '',
          savings_balance: { amount: '4321', precision: 3, nai: '@@000000021' },
          savings_hbd_balance: { amount: '1250', precision: 3, nai: '@@000000013' }
        })
      )
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

/** Opens the withdraw dialog of the savings balance whose menu button starts with `balance`. */
const openWithdrawDialog = async (page: Page, balance: RegExp, item: string): Promise<Locator> => {
  await page.clock.setFixedTime(NOW);
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
  return openBalanceMenuDialog(page, page.getByRole('button').filter({ hasText: balance }), item, 'Savings Withdraw');
};

const submitAmount = async (dialog: Locator, amount: string) => {
  await dialog.getByPlaceholder('Amount').fill(amount);
  await dialog.getByRole('button', { name: 'Next' }).click();
};

const confirmDialog = (page: Page) => page.getByRole('dialog', { name: 'Confirm Savings Withdraw' });

test.describe('Transfer from savings broadcast', () => {
  test('WALLET-TX-SAVINGS-OUT-01 — withdrawing HIVE sends it back to the owner', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openWithdrawDialog(page, /^4\.321 HIVE/, 'Withdraw HIVE');
    await submitAmount(dialog, '4.3');
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferFromSavingsOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_ACCOUNT,
      amount: naiAsset('4.300 HIVE'),
      memo: '',
      request_id: REQUEST_ID
    });
  });

  test('WALLET-TX-SAVINGS-OUT-02 — withdrawing HBD broadcasts an HBD amount', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openWithdrawDialog(page, /^\$1\.250/, 'Withdraw HIVE DOLLARS');
    await submitAmount(dialog, '1.25');
    await confirmDialog(page).getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectTransferFromSavingsOperation(broadcasts.calls[0], {
      from: STUB_ACCOUNT,
      to: STUB_ACCOUNT,
      amount: naiAsset('1.250 HBD'),
      memo: '',
      request_id: REQUEST_ID
    });
  });

  test('WALLET-TX-SAVINGS-OUT-03 — more than the savings balance is refused and broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await openWithdrawDialog(page, /^4\.321 HIVE/, 'Withdraw HIVE');
    await submitAmount(dialog, '4.322');

    await expect(dialog.getByText('Insufficient funds.')).toBeVisible();
    await expect(confirmDialog(page)).toBeHidden();
    expect(broadcasts.calls).toHaveLength(0);
  });
});

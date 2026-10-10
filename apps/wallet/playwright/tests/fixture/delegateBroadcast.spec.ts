import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectDelegateVestingSharesOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';

/**
 * Delegate from the HIVE POWER balance menu signs and broadcasts one
 * `delegate_vesting_shares_operation` of the VESTS the HP amount is worth at the stub's vesting
 * fund (180,000,000.000 HIVE for 330,000,000,000.000000 VESTS: 3 HP is 5,500 VESTS); an amount
 * above the account's 900.000 HP broadcasts nothing. Reads come from the stub node
 * (support/walletApiStub.ts); the broadcast and `verify_authority` are answered by the
 * interceptor, so the key signing it belongs to no account.
 */

const HYDRATION_TIMEOUT = 30_000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

/** The dialog's title, as the wallet's English locale spells it. */
const DELEGATE_TITLE = 'Delagate To Account';

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

/**
 * Opens the Delegate dialog of STUB_ACCOUNT's transfers page, logged in with its active key, and
 * fills in STUB_FOLLOWED as the delegatee and `amount` HP.
 */
const fillDelegateDialog = async (page: Page, amount: string) => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

  const menuTrigger = page.getByTestId('wallet-hive-power').getByRole('button');
  const menu = page.getByRole('menu');
  await expect(async () => {
    await menuTrigger.click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await menu.getByText('Delegate', { exact: true }).click();

  const dialog = page.getByRole('dialog', { name: DELEGATE_TITLE, exact: true });
  await dialog.locator('input[cmdk-input]').fill('stub-f');
  await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` }).click();
  await dialog.getByPlaceholder('Amount').fill(amount);
  await dialog.getByRole('button', { name: 'Next' }).click();
  return dialog;
};

test.describe('Delegate broadcast', () => {
  test('WALLET-TX-DELEGATE-01 — delegating broadcasts the delegator, delegatee and the VESTS of the HP amount', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await fillDelegateDialog(page, '3');

    const confirm = page.getByRole('dialog', { name: `Confirm ${DELEGATE_TITLE}` });
    await confirm.getByRole('button', { name: 'OK' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectDelegateVestingSharesOperation(broadcasts.calls[0], {
      delegator: STUB_ACCOUNT,
      delegatee: STUB_FOLLOWED,
      vesting_shares: naiAsset('5500.000000 VESTS')
    });
  });

  test('WALLET-TX-DELEGATE-02 — an amount above the available HP is refused and broadcasts nothing', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const dialog = await fillDelegateDialog(page, '900.001');

    await expect(dialog.getByText('Insufficient funds.')).toBeVisible();
    await expect(page.getByRole('dialog', { name: `Confirm ${DELEGATE_TITLE}` })).toHaveCount(0);
    expect(broadcasts.calls).toHaveLength(0);
  });
});

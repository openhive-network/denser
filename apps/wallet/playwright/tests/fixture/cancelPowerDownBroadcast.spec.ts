import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectWithdrawVestingOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  STUB_POWER_DOWN_FIELDS,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey,
  stubAccountWith
} from '../support/walletApiStub';

/**
 * While the account powers down (STUB_POWER_DOWN_FIELDS), Cancel Power Down in the HIVE POWER
 * balance menu signs and broadcasts one `withdraw_vesting_operation` of zero VESTS once its
 * prompt is confirmed, and nothing when the prompt is dismissed. Reads come from the stub node
 * (support/walletApiStub.ts); the broadcast and `verify_authority` are answered by the
 * interceptor, so the key signing it belongs to no account.
 */

const HYDRATION_TIMEOUT = 30_000;

/** Randomly generated, of no account. */
const ACTIVE_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, stubAccountWith(STUB_POWER_DOWN_FIELDS));
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

/** Opens the Cancel Power Down prompt of STUB_ACCOUNT's transfers page, logged in with its active key. */
const openCancelPowerDownPrompt = async (page: Page) => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);

  const menuTrigger = page.getByTestId('wallet-hive-power').getByRole('button');
  const menu = page.getByRole('menu');
  await expect(async () => {
    await menuTrigger.click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await menu.getByText('Cancel Power Down', { exact: true }).click();
  const prompt = page.getByRole('dialog').filter({ hasText: 'Are you sure you want to cancel Power Down?' });
  await expect(prompt).toBeVisible();
  return prompt;
};

test.describe('Cancel power down broadcast', () => {
  test('WALLET-TX-CANCELPD-01 — confirming the cancel broadcasts a withdrawal of zero VESTS', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const prompt = await openCancelPowerDownPrompt(page);

    await prompt.getByRole('button', { name: 'Cancel Power Down' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectWithdrawVestingOperation(broadcasts.calls[0], {
      account: STUB_ACCOUNT,
      vesting_shares: naiAsset('0.000000 VESTS')
    });
  });

  test('WALLET-TX-CANCELPD-02 — dismissing the prompt broadcasts nothing', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const prompt = await openCancelPowerDownPrompt(page);

    await page.keyboard.press('Escape');

    await expect(prompt).toHaveCount(0);
    expect(broadcasts.calls).toHaveLength(0);
  });
});

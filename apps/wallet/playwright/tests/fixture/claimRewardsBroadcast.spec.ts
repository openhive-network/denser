import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectClaimRewardBalanceOperation, naiAsset, type NaiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  fullAccount,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';

/**
 * Redeeming rewards from the transfers page's rewards banner signs and broadcasts one
 * `claim_reward_balance_operation` carrying the account's pending reward balances as the node
 * reports them. Reads come from the stub node (support/walletApiStub.ts), its accounts holding
 * `rewards`; the broadcast and `verify_authority` are answered by the interceptor.
 */

const HYDRATION_TIMEOUT = 30_000;

/** Randomly generated, of no account. */
const POSTING_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';

interface RewardBalances {
  reward_hive_balance: NaiAsset;
  reward_hbd_balance: NaiAsset;
  /** The HP the banner shows for `reward_vesting_balance`. */
  reward_vesting_hive: NaiAsset;
  reward_vesting_balance: NaiAsset;
}

const NO_REWARDS: RewardBalances = {
  reward_hive_balance: naiAsset('0.000 HIVE'),
  reward_hbd_balance: naiAsset('0.000 HBD'),
  reward_vesting_hive: naiAsset('0.000 HIVE'),
  reward_vesting_balance: naiAsset('0.000000 VESTS')
};

let rewards: RewardBalances = NO_REWARDS;
let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, {
    'database_api.find_accounts': ({ accounts = [] }) => ({
      accounts: accounts.map((name) => fullAccount({ name, ...rewards }))
    })
  });
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context }) => {
  rewards = NO_REWARDS;
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
});

const openOwnTransfersPage = async (page: Page) => {
  await logInAsStubAccount(page, 'posting');
  await storeStubAccountKey(page, 'posting', POSTING_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`);
};

const redeemButton = (page: Page) => page.getByRole('button', { name: 'Redeem Rewards (Transfer To Balance)' });

test.describe('Claim rewards broadcast', () => {
  test('WALLET-TX-CLAIM-01 — redeeming broadcasts the pending HIVE, HBD and VESTS rewards', async ({ page }) => {
    rewards = {
      reward_hive_balance: naiAsset('1.234 HIVE'),
      reward_hbd_balance: naiAsset('0.567 HBD'),
      reward_vesting_hive: naiAsset('2.001 HIVE'),
      reward_vesting_balance: naiAsset('3628.012345 VESTS')
    };
    const broadcasts = await installBroadcastInterceptor(page);
    await openOwnTransfersPage(page);

    await expect(page.getByText('Your current rewards: 1.234 HIVE, 0.567 HBD and 2.001 HP')).toBeVisible({
      timeout: HYDRATION_TIMEOUT
    });
    // The button renders only once the client knows the signed-in user, i.e. after hydration.
    await redeemButton(page).click({ timeout: HYDRATION_TIMEOUT });

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectClaimRewardBalanceOperation(broadcasts.calls[0], {
      account: STUB_ACCOUNT,
      reward_hive: naiAsset('1.234 HIVE'),
      reward_hbd: naiAsset('0.567 HBD'),
      reward_vests: naiAsset('3628.012345 VESTS')
    });
  });

  test('WALLET-TX-CLAIM-02 — redeeming HBD rewards alone broadcasts zero HIVE and VESTS', async ({ page }) => {
    rewards = { ...NO_REWARDS, reward_hbd_balance: naiAsset('0.001 HBD') };
    const broadcasts = await installBroadcastInterceptor(page);
    await openOwnTransfersPage(page);

    await expect(page.getByText('Your current rewards: 0.001 HBD', { exact: true })).toBeVisible({
      timeout: HYDRATION_TIMEOUT
    });
    await redeemButton(page).click({ timeout: HYDRATION_TIMEOUT });

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectClaimRewardBalanceOperation(broadcasts.calls[0], {
      account: STUB_ACCOUNT,
      reward_hive: naiAsset('0.000 HIVE'),
      reward_hbd: naiAsset('0.001 HBD'),
      reward_vests: naiAsset('0.000000 VESTS')
    });
  });

  test('WALLET-TX-CLAIM-03 — with no pending rewards there is nothing to redeem and nothing is broadcast', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await openOwnTransfersPage(page);

    // The owner's balance menu opens only once the page has hydrated with the signed-in user.
    const menuTrigger = page.getByTestId('wallet-hive-value').getByRole('button');
    const menu = page.getByRole('menu');
    await expect(async () => {
      await menuTrigger.click();
      await expect(menu).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: HYDRATION_TIMEOUT });
    await page.keyboard.press('Escape');

    await expect(page.getByText('Your current rewards:')).toHaveCount(0);
    await expect(redeemButton(page)).toHaveCount(0);
    expect(broadcasts.calls).toHaveLength(0);
  });
});

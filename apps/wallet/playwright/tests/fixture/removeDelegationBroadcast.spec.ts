import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor } from '../support/broadcastInterceptor';
import { expectDelegateVestingSharesOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  STUB_DELEGATEE,
  logInAsStubAccount,
  startWalletApiStub,
  storeStubAccountKey
} from '../support/walletApiStub';

/**
 * Revoke on a row of /@account/delegations signs and broadcasts one
 * `delegate_vesting_shares_operation` of zero VESTS to that row's delegatee once its prompt is
 * confirmed, and nothing when the prompt is cancelled. Reads come from the stub node
 * (support/walletApiStub.ts), whose one HP delegation goes to STUB_DELEGATEE; the broadcast and
 * `verify_authority` are answered by the interceptor, so the key signing it belongs to no account.
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

/** Opens the revoke prompt of STUB_DELEGATEE's delegation, logged in as STUB_ACCOUNT with its active key. */
const openRevokePrompt = async (page: Page) => {
  await logInAsStubAccount(page, 'active');
  await storeStubAccountKey(page, 'active', ACTIVE_WIF);
  await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/delegations`);

  const revoke = page
    .getByTestId('wallet-delegation-item')
    .filter({ hasText: STUB_DELEGATEE })
    .getByRole('button', { name: 'Revoke' });
  const prompt = page.getByRole('dialog', { name: 'Confirm Delegate Vesting Shares' });
  await expect(async () => {
    await revoke.click();
    await expect(prompt).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  return prompt;
};

test.describe('Remove delegation broadcast', () => {
  test('WALLET-TX-UNDELEGATE-01 — revoking a delegation broadcasts zero VESTS to its delegatee', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const prompt = await openRevokePrompt(page);

    await prompt.getByRole('button', { name: 'Ok' }).click();

    await broadcasts.waitForCount(1);
    expect(broadcasts.calls).toHaveLength(1);
    expectDelegateVestingSharesOperation(broadcasts.calls[0], {
      delegator: STUB_ACCOUNT,
      delegatee: STUB_DELEGATEE,
      vesting_shares: naiAsset('0.000000 VESTS')
    });
  });

  test('WALLET-TX-UNDELEGATE-02 — cancelling the revoke prompt broadcasts nothing', async ({ page }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    const prompt = await openRevokePrompt(page);

    await prompt.getByRole('button', { name: 'Cancel' }).click();

    await expect(prompt).toHaveCount(0);
    expect(broadcasts.calls).toHaveLength(0);
  });
});

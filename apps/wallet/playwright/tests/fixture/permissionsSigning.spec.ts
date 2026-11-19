import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';
import {
  OTHER_ACCOUNT,
  STUB_KEYS,
  STUB_MASTER_PASSWORD,
  STUB_RECOVERY_ACCOUNT,
  stubAccountKeys
} from '../support/accountKeys';
import enWallet from '../../../locales/en/common_wallet.json';

/**
 * The Keys & Permissions page lists any account's keys read-only, and only on the signed-in user's
 * own page says how the session signs and offers to reveal private keys: a master password derives
 * the signed-in account's keys, so another account's page must not offer it. The API answers come
 * from the stub node (support/walletApiStub.ts), whose STUB_ACCOUNT holds the keys
 * STUB_MASTER_PASSWORD derives (support/accountKeys.ts).
 */

const HYDRATION_TIMEOUT = 30_000;
const PERMISSIONS = enWallet.permissions;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, stubAccountKeys());
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

test.describe('Keys & Permissions per viewer', () => {
  test("WALLET-ACCOUNT-KEYS-01 — another account's page lists its keys with no reveal or signing section", async ({
    page
  }) => {
    await logInAsStubAccount(page, { username: OTHER_ACCOUNT, loginType: 'wif' });
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/permissions`);

    const summary = page.getByTestId('permissions-summary');
    await expect(summary.getByTestId('permissions-role-owner')).toContainText(STUB_KEYS.owner.publicKey, {
      timeout: HYDRATION_TIMEOUT
    });
    await expect(summary.getByTestId('permissions-role-active')).toContainText(STUB_KEYS.active.publicKey);
    await expect(summary.getByTestId('permissions-role-posting')).toContainText(STUB_KEYS.posting.publicKey);
    await expect(summary.getByTestId('permissions-role-posting')).toContainText('Threshold: 1');
    await expect(summary.getByTestId('permissions-memo-key')).toHaveText(STUB_KEYS.memo.publicKey);
    await expect(summary.getByTestId('permissions-recovery-account')).toHaveText(`@${STUB_RECOVERY_ACCOUNT}`);
    await expect(page.getByText(PERMISSIONS.about_this_account.replace('{{username}}', STUB_ACCOUNT))).toBeVisible();

    await expect(page.getByText(PERMISSIONS.note)).toHaveCount(0);
    await expect(page.getByRole('button', { name: PERMISSIONS.reveal })).toHaveCount(0);
    await expect(page.getByTestId('how-you-sign')).toHaveCount(0);
    await expect(page.getByTestId('key-mark-session')).toHaveCount(0);
  });

  test('WALLET-ACCOUNT-KEYS-02 — the own page of a WIF session marks its key and reveals keys from the master password', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'wif', keyType: 'active' });
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/permissions`);

    const howYouSign = page.getByTestId('how-you-sign');
    await expect(howYouSign).toContainText(PERMISSIONS.how_you_sign.wif, { timeout: HYDRATION_TIMEOUT });
    // The session signs with the active role's only key
    const activeRole = page.getByTestId('permissions-summary').getByTestId('permissions-role-active');
    await expect(activeRole.getByTestId('key-mark-session')).toHaveText(enWallet.account_keys.this_session);
    await expect(page.getByTestId('permissions-role-posting').getByTestId('key-mark-session')).toHaveCount(0);

    await page.getByRole('button', { name: PERMISSIONS.reveal }).first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(PERMISSIONS.reveal_dialog);
    await dialog.getByLabel(PERMISSIONS.master_password).fill(STUB_MASTER_PASSWORD);
    await dialog.getByRole('button', { name: PERMISSIONS.reveal }).click();

    await expect(page.locator('#posting')).toHaveValue(STUB_KEYS.posting.wif, { timeout: HYDRATION_TIMEOUT });
    await expect(page.locator('#posting')).toHaveAttribute('type', 'input');
  });

  test('WALLET-ACCOUNT-KEYS-03 — the own page of a Keychain session says Keychain holds the keys', async ({
    page
  }) => {
    await logInAsStubAccount(page, { loginType: 'keychain', keyType: 'active' });
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/permissions`);

    await expect(page.getByTestId('how-you-sign')).toContainText(
      PERMISSIONS.how_you_sign.external_wallet.replace('{{wallet}}', 'Hive Keychain'),
      { timeout: HYDRATION_TIMEOUT }
    );
    await expect(page.getByRole('button', { name: PERMISSIONS.reveal })).toHaveCount(0);
  });
});

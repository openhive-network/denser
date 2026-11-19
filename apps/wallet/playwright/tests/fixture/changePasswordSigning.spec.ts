import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { installKeychainStub, keychainCalls } from '../support/keychainStub';
import { STUB_ACCOUNT, logInAsStubAccount, startWalletApiStub } from '../support/walletApiStub';
import { OTHER_ACCOUNT, STUB_KEYS, STUB_MASTER_PASSWORD, stubAccountKeys } from '../support/accountKeys';
import enWallet from '../../../locales/en/common_wallet.json';

/**
 * The Change Password page changes the keys of the signed-in user's own account only, takes the
 * current master password or the owner private key, and before anything is signed says what the
 * session's login method needs updated afterwards. Keychain is a stub (support/keychainStub.ts) and
 * the API answers come from the stub node, whose STUB_ACCOUNT holds the keys STUB_MASTER_PASSWORD
 * derives (support/accountKeys.ts). Nothing is signed or broadcast: each test stops at the
 * confirmation.
 */

const HYDRATION_TIMEOUT = 30_000;
const PAGE = enWallet.change_password_page;
const KEYCHAIN_FOLLOW_UP = enWallet.account_keys.follow_up.update_wallet.replace('{{wallet}}', 'Hive Keychain');

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, stubAccountKeys());
});

test.afterAll(async () => {
  await new Promise((resolve) => stub.close(resolve));
});

let broadcasts: string[];

// As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
test.beforeEach(async ({ context, page }) => {
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
  });
  broadcasts = [];
  page.on('request', (request) => {
    if (request.postData()?.includes('broadcast_transaction')) broadcasts.push(request.url());
  });
});

const signTxCalls = async (page: Page) =>
  (await keychainCalls(page)).filter(({ method }) => method === 'requestSignTx');

/** Fills the form for a change to a generated password, `credential` proving the current keys, and submits it. */
async function submitPasswordChange(page: Page, credential: string) {
  await page.getByLabel(PAGE.current_credential).fill(credential);
  await page.getByRole('button', { name: PAGE.click_to_generate_password }).click();
  await page.getByLabel(PAGE.security_notes.confirm_security).check();
  await page.getByRole('button', { name: PAGE.show, exact: true }).click();
  const generated = await page.getByTestId('generated-key-master').innerText();
  await page.getByLabel(PAGE.re_enter_generate_password).fill(generated);
  await page.getByLabel(PAGE.understand_that).check();
  await page.getByLabel(PAGE.i_saved_password).check();
  await page.getByRole('button', { name: PAGE.update_password }).click();
}

test.describe('Change Password per viewer and login method', () => {
  test("WALLET-CHANGE-PASSWORD-01 — another account's page asks to sign in as it instead of showing the form", async ({
    page
  }) => {
    await logInAsStubAccount(page, { username: OTHER_ACCOUNT, loginType: 'wif' });
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/password`);

    await expect(page.getByTestId('change-password-sign-in-notice')).toHaveText(
      PAGE.sign_in_notice.replace('{{username}}', STUB_ACCOUNT),
      { timeout: HYDRATION_TIMEOUT }
    );
    await expect(page.getByLabel(PAGE.current_credential)).toHaveCount(0);
    await expect(page.getByRole('button', { name: PAGE.update_password })).toHaveCount(0);
  });

  test('WALLET-CHANGE-PASSWORD-02 — a Keychain session is told to update Keychain before it confirms', async ({
    page
  }) => {
    await installKeychainStub(page, {});
    await logInAsStubAccount(page, { loginType: 'keychain', keyType: 'active' });
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/password`);

    await expect(page.getByTestId('key-change-follow-up')).toHaveText(KEYCHAIN_FOLLOW_UP, {
      timeout: HYDRATION_TIMEOUT
    });
    await submitPasswordChange(page, STUB_MASTER_PASSWORD);

    const confirm = page.getByTestId('change-password-confirm-dialog');
    await expect(confirm).toContainText(KEYCHAIN_FOLLOW_UP, { timeout: HYDRATION_TIMEOUT });
    await expect(confirm.getByRole('button', { name: PAGE.confirm.proceed })).toBeVisible();
    await confirm.getByRole('button', { name: PAGE.confirm.cancel }).click();

    await expect(confirm).toBeHidden();
    expect(await signTxCalls(page)).toEqual([]);
    expect(broadcasts).toEqual([]);
  });

  test('WALLET-CHANGE-PASSWORD-03 — the owner private key proves the current keys as the master password does', async ({
    page
  }) => {
    await installKeychainStub(page, {});
    await logInAsStubAccount(page, { loginType: 'keychain', keyType: 'active' });
    await page.goto(`${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/password`);
    await expect(page.getByLabel(PAGE.current_credential)).toBeVisible({ timeout: HYDRATION_TIMEOUT });

    await submitPasswordChange(page, STUB_KEYS.active.wif);
    await expect(page.getByText(PAGE.errors.not_owner_key)).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await expect(page.getByTestId('change-password-confirm-dialog')).toHaveCount(0);

    await page.getByLabel(PAGE.current_credential).fill(STUB_KEYS.owner.wif);
    await page.getByRole('button', { name: PAGE.update_password }).click();
    const confirm = page.getByTestId('change-password-confirm-dialog');
    await expect(confirm).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await confirm.getByRole('button', { name: PAGE.confirm.cancel }).click();

    expect(await signTxCalls(page)).toEqual([]);
    expect(broadcasts).toEqual([]);
  });
});

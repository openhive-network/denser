import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { LoginForm } from '../support/pages/loginForm';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { STUB_ACCOUNT, fullAccount, startWalletApiStub } from '../support/walletApiStub';

/**
 * The safe-storage sign-in stores the wallet's active key: a posting key is refused in place with
 * the same error as the WIF sign-in (wifLoginKeyRole.spec.ts), the key kept in its field, before
 * anything is stored. So is a key of none of the account's authorities, which the chain's
 * `verify_authority` refuses: it names the active key too, not hb-auth's "Invalid credentials".
 * Typed at the keyboard and left with Tab, such a key, which nobody holds, is refused before any
 * submit, and changing the account drops the refusal.
 * The API answers come from the stub node (support/walletApiStub.ts), whose account holds the
 * generated key below as its only posting key, and which knows no account holding any key.
 */

const HYDRATION_TIMEOUT = 30_000;

/** `getPrivateKeyFromPassword('gtg', 'posting', 'denser-fixture-posting-key')`, a key of no real account. */
const POSTING_WIF = '5KQ8zgZx9Q4YuU8eUVcXfbVGQxe96eCXynREFJxdJvar8FQJvhk';
const POSTING_PUBLIC_KEY = 'STM5J5fKpBEfiFEANpk321mLT3oNTZ4xTW4Vq8E33eA3zBSWRbViL';
/** `getPrivateKeyFromPassword('gtg', 'active', 'denser-fixture-posting-key')`: no authority of the stub account. */
const UNKNOWN_WIF = '5Jg6Um6AvJZ886UWQnNBfqScNo9f8PtGWecXo7gZS29FoVgektM';

const SAFE_STORAGE_PASSWORD = 'fixture-password';
const ACTIVE_KEY_ERROR =
  "This key doesn't have active authority. The wallet needs your active key to sign this.";
const INVALID_CREDENTIALS = 'Invalid credentials';

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, {
    'database_api.find_accounts': ({ accounts = [] }) => ({
      accounts: accounts.map((name) =>
        fullAccount({
          name,
          posting: { weight_threshold: 1, account_auths: [], key_auths: [[POSTING_PUBLIC_KEY, 1]] }
        })
      )
    }),
    'account_by_key_api.get_key_references': () => ({ accounts: [[]] })
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

async function openSafeStorageForm(loginForm: LoginForm) {
  await loginForm.page.goto(`${WALLET_BASE_PATH}/market`);
  await expect(async () => {
    await loginForm.page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });

  await expect(loginForm.wifInput).toBeVisible({ timeout: HYDRATION_TIMEOUT });
}

async function submitSafeStorageForm(loginForm: LoginForm, wif: string) {
  await openSafeStorageForm(loginForm);
  await loginForm.usernameInput.fill(STUB_ACCOUNT);
  await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
  await loginForm.wifInput.fill(wif);
  await loginForm.saveSignInButton.click();
}

test.describe('Safe-storage sign-in with a key of the wrong role', () => {
  test('WALLET-SAFE-STORAGE-LOGIN-01 — a posting key keeps the safe-storage form open with an error', async ({
    page
  }) => {
    const loginForm = new LoginForm(page);
    await submitSafeStorageForm(loginForm, POSTING_WIF);

    await expect(loginForm.wifInputErrorMessage).toHaveText(ACTIVE_KEY_ERROR);
    await expect(loginForm.loginFormHeader).toBeVisible();
    await expect(loginForm.wifInput).toHaveValue(POSTING_WIF);
    await expect(loginForm.usernameInput).toHaveValue(STUB_ACCOUNT);
    await expect(loginForm.loginDialog).not.toContainText(INVALID_CREDENTIALS);
  });

  test('WALLET-SAFE-STORAGE-LOGIN-02 — a key of no authority keeps the form open, naming the active key', async ({
    page
  }) => {
    const loginForm = new LoginForm(page);
    await submitSafeStorageForm(loginForm, UNKNOWN_WIF);

    await expect(loginForm.wifInputErrorMessage).toHaveText(ACTIVE_KEY_ERROR, { timeout: HYDRATION_TIMEOUT });
    await expect(loginForm.loginFormHeader).toBeVisible();
    await expect(loginForm.wifInput).toHaveValue(UNKNOWN_WIF);
    await expect(loginForm.loginDialog).not.toContainText(INVALID_CREDENTIALS);
  });

  test('WALLET-SAFE-STORAGE-LOGIN-03 — a typed key nobody holds is refused on Tab; changing the account drops it', async ({
    page
  }) => {
    const loginForm = new LoginForm(page);
    await openSafeStorageForm(loginForm);
    await loginForm.usernameInput.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type(STUB_ACCOUNT, { delay: 20 });
    await page.keyboard.press('Tab');
    await page.keyboard.type(SAFE_STORAGE_PASSWORD, { delay: 20 });
    await loginForm.wifInput.click();
    await page.keyboard.type(UNKNOWN_WIF, { delay: 20 });
    await page.keyboard.press('Tab');

    await expect(loginForm.wifInputErrorMessage).toHaveText(ACTIVE_KEY_ERROR, { timeout: HYDRATION_TIMEOUT });
    await expect(loginForm.wifInput).toHaveValue(UNKNOWN_WIF);

    await loginForm.usernameInput.click();
    await page.keyboard.press('End');
    await page.keyboard.type('x', { delay: 20 });
    await expect(loginForm.wifInputErrorMessage).toHaveCount(0);
  });
});

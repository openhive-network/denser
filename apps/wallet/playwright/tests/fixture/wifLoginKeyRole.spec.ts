import type { Server } from 'node:http';
import { test, expect } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { LoginForm } from '../support/pages/loginForm';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { STUB_ACCOUNT, fullAccount, startWalletApiStub } from '../support/walletApiStub';

/**
 * The wallet signs in with the active key: a posting key entered in the WIF dialog is refused in
 * place, with an error, the key and the rest of the form kept, before anything is signed. A key no
 * account holds is refused as its field loses focus, typed at the keyboard, and on submit, which
 * leaves the dialog open. The API answers come from the stub node (support/walletApiStub.ts), whose
 * account holds the generated key below as its only posting key, and which tells no account holds
 * any other key.
 */

const HYDRATION_TIMEOUT = 30_000;

/** `getPrivateKeyFromPassword('gtg', 'posting', 'denser-fixture-posting-key')`, a key of no real account. */
const POSTING_WIF = '5KQ8zgZx9Q4YuU8eUVcXfbVGQxe96eCXynREFJxdJvar8FQJvhk';
const POSTING_PUBLIC_KEY = 'STM5J5fKpBEfiFEANpk321mLT3oNTZ4xTW4Vq8E33eA3zBSWRbViL';
/** A randomly generated key, held by no account */
const UNHELD_WIF = '5Jp5Ei5K5Yg8BpALHRsS1bnfsWu7oLUAUk77CinpCbHDsCTeJrR';
const TYPING_DELAY_MS = 20;

const ACTIVE_KEY_ERROR = "This key doesn't have active authority. The wallet needs your active key to sign this.";

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

test.describe('WIF sign-in with a key of the wrong role', () => {
  test('WALLET-WIF-LOGIN-01 — a posting key keeps the WIF form open with an error', async ({ page }) => {
    const loginForm = new LoginForm(page);
    await page.goto(`${WALLET_BASE_PATH}/market`);

    await expect(async () => {
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: HYDRATION_TIMEOUT });

    await loginForm.otherSignInOptionsButton.click();
    await loginForm.otherSignInOptionsUsernameInput.fill(STUB_ACCOUNT);
    await expect(loginForm.signInWithWifButton).toBeEnabled();
    await loginForm.signInWithWifButton.click();

    await expect(loginForm.headerEnterYourKey).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await loginForm.rememberKeyForTabCheckbox.check();
    await loginForm.postingPrivateKeyInput.fill(POSTING_WIF);
    await loginForm.postingPrivateKeySubmitButton.click();

    await expect(loginForm.passwordErrorMessageEnterYourWifKey).toHaveText(ACTIVE_KEY_ERROR);
    await expect(loginForm.headerEnterYourKey).toBeVisible();
    await expect(loginForm.postingPrivateKeyInput).toHaveValue(POSTING_WIF);
    await expect(loginForm.rememberKeyForTabCheckbox).toBeChecked();
    await expect(loginForm.otherSignInOptionsUsernameInput).toHaveValue(STUB_ACCOUNT);

    const storedKeys = await page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith('wif.')));
    expect(storedKeys).toEqual([]);
    expect(broadcasts).toEqual([]);
  });

  test("WALLET-WIF-LOGIN-02 — cancelling the WIF dialog is the user's cancel, with no error", async ({ page }) => {
    const loginForm = new LoginForm(page);
    await page.goto(`${WALLET_BASE_PATH}/market`);

    await expect(async () => {
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: HYDRATION_TIMEOUT });

    await loginForm.otherSignInOptionsButton.click();
    await loginForm.otherSignInOptionsUsernameInput.fill(STUB_ACCOUNT);
    await expect(loginForm.signInWithWifButton).toBeEnabled();
    await loginForm.signInWithWifButton.click();

    await expect(loginForm.headerEnterYourKey).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    // The sign-in step spins until the sign-in settled, the error, if any, already shown
    const signInSpinner = loginForm.loginDialog.locator('.animate-spin');
    await expect(signInSpinner).toBeVisible();
    await loginForm.passwordToUnlockKeyCancelButton.click();

    await expect(loginForm.headerEnterYourKey).toBeHidden();
    await expect(signInSpinner).toHaveCount(0);
    await expect(loginForm.otherSignInOptionsUsernameInput).toHaveValue(STUB_ACCOUNT);
    // Counted at once: a retried count would wait out the toast's own dismissal
    expect(await page.getByTestId('error-toast-content').count()).toBe(0);
    await expect(loginForm.otherSignInOptionsErrorMessage).toHaveCount(0);
    expect(broadcasts).toEqual([]);
  });

  test('WALLET-WIF-LOGIN-03 — a key nobody holds is refused on Tab, and on submit the dialog stays open', async ({
    page
  }) => {
    const loginForm = new LoginForm(page);
    await page.goto(`${WALLET_BASE_PATH}/market`);

    await expect(async () => {
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: HYDRATION_TIMEOUT });

    await loginForm.otherSignInOptionsButton.click();
    await loginForm.otherSignInOptionsUsernameInput.fill(STUB_ACCOUNT);
    await expect(loginForm.signInWithWifButton).toBeEnabled();
    await loginForm.signInWithWifButton.click();

    await expect(loginForm.headerEnterYourKey).toBeVisible({ timeout: HYDRATION_TIMEOUT });
    await loginForm.postingPrivateKeyInput.click();
    await page.keyboard.type(UNHELD_WIF, { delay: TYPING_DELAY_MS });
    await page.keyboard.press('Tab');

    await expect(loginForm.passwordErrorMessageEnterYourWifKey).toHaveText(ACTIVE_KEY_ERROR);
    await expect(loginForm.postingPrivateKeyInput).toHaveValue(UNHELD_WIF);

    // Checked again on submit, which then settles with the dialog open
    const checked = page.waitForRequest((request) => request.postData()?.includes('get_key_references') ?? false);
    await loginForm.postingPrivateKeySubmitButton.click();
    await checked;
    await expect(loginForm.postingPrivateKeySubmitButton).toBeEnabled();
    await expect(loginForm.passwordErrorMessageEnterYourWifKey).toHaveText(ACTIVE_KEY_ERROR);
    await expect(loginForm.headerEnterYourKey).toBeVisible();
    await expect(loginForm.postingPrivateKeyInput).toHaveValue(UNHELD_WIF);
    expect(await page.getByTestId('error-toast-content').count()).toBe(0);
    expect(broadcasts).toEqual([]);
  });
});

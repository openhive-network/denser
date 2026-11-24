import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { openBalanceMenuDialog } from '../support/balanceMenu';
import { WALLET_BASE_PATH } from '../support/basePath';
import { installBroadcastInterceptor, type BroadcastInterceptor } from '../support/broadcastInterceptor';
import { restoreIndexedDb } from '../support/indexedDbDump';
import { LoginForm } from '../support/pages/loginForm';
import { expectTransferOperation, naiAsset } from '../support/walletOperations';
import {
  STUB_ACCOUNT,
  STUB_FOLLOWED,
  logInAsStubAccount,
  startWalletApiStub,
  stubAccountWith
} from '../support/walletApiStub';
import longPasswordWallet from '../mock/safe-storage/long-password-wallet.json';
import enSmartSigner from '../../../../../packages/smart-signer/locales/en/smart-signer.json';

/**
 * A safe-storage wallet whose password is longer than the 512 characters a new wallet's password
 * may have, recorded as testers set one before that maximum applied (mock/safe-storage/README.md),
 * still unlocks with it: in the sign-in form and in the prompt a transfer of the signed-in, locked
 * wallet opens. Its first 512 characters are a wrong password in both, so the whole password is
 * what unlocks it. The stub node (support/walletApiStub.ts) vouches for the wallet's key as
 * activeCheck.spec.ts's does; the broadcast is intercepted.
 */

const HYDRATION_TIMEOUT = 30_000;
const MAX_NEW_PASSWORD_LENGTH = 512;
const { password: LONG_PASSWORD } = longPasswordWallet;
const TRUNCATED_PASSWORD = LONG_PASSWORD.slice(0, MAX_NEW_PASSWORD_LENGTH);
const SIGN_IN_TEXTS = enSmartSigner.login_form.signin_safe_storage;
const WRONG_PASSWORD = enSmartSigner.broadcast_error.wrong_safe_storage_password;

/** The public key of the recorded wallet's key, a key of no real account */
const SHARED_PUBLIC_KEY = 'STM5dRfo5EMpM51eN3pS8Gn1CDGVZXjRanwfJP8oEXQ8KS36HhB2W';
const sharedAuthority = { weight_threshold: 1, account_auths: [], key_auths: [[SHARED_PUBLIC_KEY, 1]] };

const ownTransfersPage = `${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`;
/** A page of the wallet's origin that loads nothing, to write IndexedDB before the wallet opens it */
const SEED_PAGE = `${WALLET_BASE_PATH}/__indexeddb-seed`;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(undefined, {
    ...stubAccountWith({ posting: sharedAuthority, active: sharedAuthority }),
    'database_api.verify_authority': () => ({ valid: true }),
    'account_by_key_api.get_key_references': () => ({ accounts: [[STUB_ACCOUNT]] })
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

/** Restores the recorded long-password wallet into IndexedDB, locked: no hb-auth worker has unlocked it */
async function restoreLongPasswordWallet(page: Page) {
  expect(longPasswordWallet.username, "the recorded wallet is the stub account's").toBe(STUB_ACCOUNT);
  expect(LONG_PASSWORD.length, 'the recorded password is over the maximum of a new one').toBeGreaterThan(
    MAX_NEW_PASSWORD_LENGTH
  );
  await page.route(`**${SEED_PAGE}`, (route) => route.fulfill({ contentType: 'text/html', body: '<!doctype html>' }));
  await page.goto(SEED_PAGE);
  await restoreIndexedDb(page, longPasswordWallet);
  await page.unroute(`**${SEED_PAGE}`);
}

const signInButton = (loginForm: LoginForm) =>
  loginForm.loginDialog.getByRole('button', { name: SIGN_IN_TEXTS.button_signin, exact: true });

/** Signs in with `password` in the sign-in form, open on the stored account */
async function submitSignIn(loginForm: LoginForm, password: string) {
  await loginForm.passwordInput.fill(password);
  await expect(loginForm.passwordErrorMessage).toHaveCount(0);
  await signInButton(loginForm).click();
}

/** Fills in a transfer of 1 HIVE to STUB_FOLLOWED and confirms it, up to the prompt unlocking the wallet */
async function transferUpToUnlockPrompt(page: Page, loginForm: LoginForm) {
  const dialog = await openBalanceMenuDialog(
    page,
    page.getByTestId('wallet-hive-value').getByRole('button'),
    'Transfer',
    'Transfer To Account'
  );
  await dialog.locator('input[cmdk-input]').fill('stub-f');
  await dialog.getByRole('option', { name: `${STUB_FOLLOWED} (Following)` }).click();
  await dialog.getByPlaceholder('Amount').fill('1');
  await dialog.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('dialog', { name: 'Confirm Transfer To Account' }).getByRole('button', { name: 'OK' }).click();
  await expect(loginForm.enterYourPasswordForm).toBeVisible({ timeout: HYDRATION_TIMEOUT });
}

/** Answers the open unlock prompt with `password` */
async function submitUnlock(loginForm: LoginForm, password: string) {
  await loginForm.passwordToUnlockKeyInput.fill(password);
  await loginForm.passwordToUnlockKeySubmitButton.click();
}

function expectTransferBroadcast(broadcasts: BroadcastInterceptor) {
  expectTransferOperation(broadcasts.calls[0], {
    from: STUB_ACCOUNT,
    to: STUB_FOLLOWED,
    amount: naiAsset('1.000 HIVE'),
    memo: ''
  });
}

test.describe('A safe-storage wallet with a password over 512 characters', () => {
  test('WALLET-SAFE-STORAGE-LONG-PASSWORD-01 — the sign-in form unlocks it with the whole password', async ({ page }) => {
    await restoreLongPasswordWallet(page);
    await page.goto(ownTransfersPage);
    const loginForm = new LoginForm(page);
    await expect(async () => {
      await page.getByRole('button', { name: 'Login', exact: true }).click();
      await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: HYDRATION_TIMEOUT });
    await loginForm.usernameInput.fill(STUB_ACCOUNT);
    await expect(loginForm.loginFormDescription).toHaveText(SIGN_IN_TEXTS.description_unlock, {
      timeout: HYDRATION_TIMEOUT
    });

    await submitSignIn(loginForm, TRUNCATED_PASSWORD);
    await expect(loginForm.loginDialog).toContainText(WRONG_PASSWORD, { timeout: HYDRATION_TIMEOUT });

    await submitSignIn(loginForm, LONG_PASSWORD);
    const notNow = loginForm.loginDialog.getByRole('button', { name: enSmartSigner.login_form.passkey_prompt.not_now });
    await expect(async () => {
      if (await notNow.isVisible()) await notNow.click();
      await expect(loginForm.loginDialog).toHaveCount(0, { timeout: 1000 });
    }, 'the current hb-auth unlocks the recorded wallet with its long password').toPass({ timeout: HYDRATION_TIMEOUT });
    await expect(page.getByTestId('profile-avatar-button')).toBeVisible();
  });

  test('WALLET-SAFE-STORAGE-LONG-PASSWORD-02 — the unlock prompt of a transfer unlocks it with the whole password', async ({
    page
  }) => {
    const broadcasts = await installBroadcastInterceptor(page);
    await restoreLongPasswordWallet(page);
    await logInAsStubAccount(page, { loginType: 'hbauth', keyType: 'active' });
    await page.goto(ownTransfersPage);
    const loginForm = new LoginForm(page);

    await transferUpToUnlockPrompt(page, loginForm);
    await submitUnlock(loginForm, TRUNCATED_PASSWORD);
    await expect(page.getByTestId('wrong-safe-storage-password-message')).toHaveText(WRONG_PASSWORD, {
      timeout: HYDRATION_TIMEOUT
    });
    expect(broadcasts.calls).toHaveLength(0);
    await page.getByRole('dialog', { name: 'Transfer To Account', exact: true }).getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await transferUpToUnlockPrompt(page, loginForm);
    await submitUnlock(loginForm, LONG_PASSWORD);
    await expect(
      loginForm.enterYourPasswordForm,
      'the unlock prompt takes the long password and the current hb-auth unlocks the recorded wallet with it'
    ).toHaveCount(0, { timeout: HYDRATION_TIMEOUT });
    await broadcasts.waitForCount(1);
    expectTransferBroadcast(broadcasts);
  });
});

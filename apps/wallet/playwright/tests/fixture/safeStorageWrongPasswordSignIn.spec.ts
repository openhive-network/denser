import type { Server } from 'node:http';
import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { LoginForm } from '../support/pages/loginForm';
import { signOutInTab } from '../support/otherTab';
import { STUB_ACCOUNT, startWalletApiStub, stubAccountWith } from '../support/walletApiStub';
import enSmartSigner from '../../../../../packages/smart-signer/locales/en/smart-signer.json';
import plSmartSigner from '../../../../../packages/smart-signer/locales/pl/smart-signer.json';
import enWallet from '../../../locales/en/common_wallet.json';
import plWallet from '../../../locales/pl/common_wallet.json';

/**
 * Signing in with safe storage that holds the account's active key, with a wrong password, says the
 * password is wrong in the page's language and keeps the sign-in form, not "Add new key". The add-key
 * dialog says so too, before it touches the stored key: the right password still signs in after it.
 * Under a signed-in, unlocked session, whose hb-auth wallet `unlock` would let any password through,
 * the add-key dialog still checks it, and a sign-in with another idle time picked stores the pick
 * and starts a worker with it only once the password was accepted.
 * The stub node (support/walletApiStub.ts) vouches for the key as safeStorageSignTimeUnlock.spec.ts's does.
 */

const HYDRATION_TIMEOUT = 30_000;

/** `getPrivateKeyFromPassword('gtg', 'active', 'denser-fixture-shared-key')`, a key of no real account. */
const SHARED_WIF = '5Jdptz9S7YME5YLzHRwVHbAjQf2r95HBFgQTbMmTYwghsUV2SfR';
const SHARED_PUBLIC_KEY = 'STM5dRfo5EMpM51eN3pS8Gn1CDGVZXjRanwfJP8oEXQ8KS36HhB2W';
const SAFE_STORAGE_PASSWORD = 'fixture-password';
const WRONG_PASSWORD = `${SAFE_STORAGE_PASSWORD}-wrong`;

const sharedAuthority = { weight_threshold: 1, account_auths: [], key_auths: [[SHARED_PUBLIC_KEY, 1]] };

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

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    // As anonymousNoWasm.spec.ts: without a network Chromium reports offline and React Query pauses.
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true,
      get: () => true
    });
    // hb-auth then runs in a dedicated worker, which a reload ends: the stored key is locked again
    Reflect.deleteProperty(globalThis, 'SharedWorker');
  });
});

const ownTransfersPage = `${WALLET_BASE_PATH}/@${STUB_ACCOUNT}/transfers`;

const WORKER_SCRIPT = /\/auth\/releasable-worker\.js\?/;
const SESSION_TIME_CHOICE_KEY = 'safe-storage-session-time';

/** The URLs of the hb-auth worker scripts the context's pages load */
async function recordWorkerUrls(context: BrowserContext): Promise<string[]> {
  const urls: string[] = [];
  await context.route(WORKER_SCRIPT, (route) => {
    urls.push(route.request().url());
    return route.continue();
  });
  return urls;
}

/** Opens the sign-in dialog, in the language whose wallet texts are `wallet` */
async function openLoginDialog(page: Page, loginForm: LoginForm, wallet: typeof enWallet = enWallet) {
  const loginButton = page.getByRole('button', { name: wallet.navigation.main_nav_bar.login, exact: true });
  await expect(async () => {
    await loginButton.click();
    await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
}

/** Stores the active key in safe storage by signing in, which leaves the session signed in and unlocked */
async function storeKeyAndStaySignedIn(page: Page): Promise<LoginForm> {
  const loginForm = new LoginForm(page);
  await page.goto(ownTransfersPage);
  await openLoginDialog(page, loginForm);
  await expect(loginForm.wifInput).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  await loginForm.usernameInput.fill(STUB_ACCOUNT);
  await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
  await loginForm.wifInput.fill(SHARED_WIF);
  await loginForm.saveSignInButton.click();
  await expect(loginForm.loginDialog).toHaveCount(0, { timeout: HYDRATION_TIMEOUT });
  return loginForm;
}

/** Stores the active key in safe storage by signing in, then signs out, leaving the key stored and locked */
async function storeKeyAndSignOut(page: Page): Promise<LoginForm> {
  const loginForm = await storeKeyAndStaySignedIn(page);
  await signOutInTab(page);
  await page.reload();
  return loginForm;
}

/** Opens the sign-in dialog of the signed-in session from the account menu's "Add account" */
async function openAddAccountDialog(page: Page, loginForm: LoginForm) {
  const avatar = page.getByTestId('profile-avatar-button');
  const menu = page.getByRole('menu');
  await expect(async () => {
    await avatar.click();
    await expect(menu).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await menu.getByTestId('account-switcher-add').click();
  await expect(loginForm.loginDialog).toBeVisible();
}

/**
 * Picks the stored account in the open sign-in form, in the language whose smart-signer texts are
 * `texts`, its key locked unless `unlocked`
 */
async function pickStoredAccount(loginForm: LoginForm, texts: typeof enSmartSigner, unlocked = false) {
  const { description_unlock, description_unlocked } = texts.login_form.signin_safe_storage;
  await loginForm.usernameInput.fill(STUB_ACCOUNT);
  await expect(loginForm.loginFormDescription).toHaveText(
    unlocked ? description_unlocked.replace('{{keyType}}', 'active') : description_unlock,
    { timeout: HYDRATION_TIMEOUT }
  );
}

const signInButton = (loginForm: LoginForm, texts: typeof enSmartSigner) =>
  loginForm.loginDialog.getByRole('button', { name: texts.login_form.signin_safe_storage.button_signin, exact: true });

/** Waits for the sign-in to close the dialog, turning down the biometric unlock it may offer first */
async function expectSignedIn(loginForm: LoginForm, texts: typeof enSmartSigner) {
  const notNow = loginForm.loginDialog.getByRole('button', { name: texts.login_form.passkey_prompt.not_now });
  await expect(async () => {
    if (await notNow.isVisible()) await notNow.click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
}

test.describe('Safe-storage sign-in with a wrong password', () => {
  for (const { id, locale, texts, wallet } of [
    { id: 'WALLET-SAFE-STORAGE-WRONG-PASSWORD-01', locale: 'en', texts: enSmartSigner, wallet: enWallet },
    { id: 'WALLET-SAFE-STORAGE-WRONG-PASSWORD-02', locale: 'pl', texts: plSmartSigner, wallet: plWallet }
  ]) {
    test(`${id} — says the password is wrong in ${locale} and keeps the sign-in form`, async ({
      page,
      context,
      baseURL
    }) => {
      const loginForm = await storeKeyAndSignOut(page);
      await context.addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL }]);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('lang', locale);

      await openLoginDialog(page, loginForm, wallet);
      await pickStoredAccount(loginForm, texts);
      await loginForm.passwordInput.fill(WRONG_PASSWORD);
      await signInButton(loginForm, texts).click();

      await expect(loginForm.loginDialog).toContainText(texts.broadcast_error.wrong_safe_storage_password, {
        timeout: HYDRATION_TIMEOUT
      });
      await expect(loginForm.loginDialog).not.toContainText(texts.login_form.signin_safe_storage.update_key_title);
      await expect(loginForm.loginDialog).not.toContainText('Invalid credentials');
      await expect(loginForm.passwordInput).toBeVisible();

      await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
      await signInButton(loginForm, texts).click();
      await expectSignedIn(loginForm, texts);
    });
  }

  test('WALLET-SAFE-STORAGE-WRONG-PASSWORD-03 — the add-key dialog says the password is wrong and keeps the stored key', async ({
    page
  }) => {
    const texts = enSmartSigner;
    const loginForm = await storeKeyAndSignOut(page);
    await openLoginDialog(page, loginForm);
    await pickStoredAccount(loginForm, texts);

    await loginForm.loginDialog.getByText(texts.login_form.signin_safe_storage.key_update, { exact: true }).click();
    await loginForm.loginDialog.getByTestId('login-form-password').fill(WRONG_PASSWORD);
    await loginForm.loginDialog.getByTestId('login-form-wif').fill(SHARED_WIF);
    await loginForm.loginDialog.getByTestId('login-form-update-key').click();

    await expect(loginForm.loginDialog).toContainText(texts.broadcast_error.wrong_safe_storage_password, {
      timeout: HYDRATION_TIMEOUT
    });
    await expect(loginForm.loginDialog).not.toContainText(texts.login_form.zod_error.key_without_active_authority);
    await expect(loginForm.loginDialog).not.toContainText('Invalid credentials');

    await loginForm.loginDialog.getByTestId('login-form-back').click();
    await pickStoredAccount(loginForm, texts);
    await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await signInButton(loginForm, texts).click();
    await expectSignedIn(loginForm, texts);
  });

  test('WALLET-SAFE-STORAGE-WRONG-PASSWORD-04 — under an unlocked session the add-key dialog still checks the password', async ({
    page
  }) => {
    const texts = enSmartSigner;
    const loginForm = await storeKeyAndStaySignedIn(page);
    await openAddAccountDialog(page, loginForm);
    await pickStoredAccount(loginForm, texts, true);

    await loginForm.loginDialog.getByText(texts.login_form.signin_safe_storage.key_update, { exact: true }).click();
    await loginForm.loginDialog.getByTestId('login-form-password').fill(WRONG_PASSWORD);
    await loginForm.loginDialog.getByTestId('login-form-wif').fill(SHARED_WIF);
    await loginForm.loginDialog.getByTestId('login-form-update-key').click();

    await expect(loginForm.loginDialog).toContainText(texts.broadcast_error.wrong_safe_storage_password, {
      timeout: HYDRATION_TIMEOUT
    });
    await expect(loginForm.loginDialog).not.toContainText('Invalid credentials');
    await expect(loginForm.loginDialog).not.toContainText(texts.login_form.signin_safe_storage.key_updated_success);

    await loginForm.loginDialog.getByTestId('login-form-password').fill(SAFE_STORAGE_PASSWORD);
    await loginForm.loginDialog.getByTestId('login-form-update-key').click();
    await expectSignedIn(loginForm, texts);
  });

  test('WALLET-SAFE-STORAGE-WRONG-PASSWORD-05 — a wrong password keeps the stored idle time and the worker', async ({
    page,
    context
  }) => {
    const texts = enSmartSigner;
    const workerUrls = await recordWorkerUrls(context);
    const loginForm = await storeKeyAndStaySignedIn(page);
    await openAddAccountDialog(page, loginForm);
    await pickStoredAccount(loginForm, texts, true);
    const workersBefore = workerUrls.length;

    await loginForm.loginDialog.getByTestId('session-time-select').click();
    await page.getByTestId('session-time-option-3600').click();
    await loginForm.passwordInput.fill(WRONG_PASSWORD);
    await signInButton(loginForm, texts).click();

    await expect(loginForm.loginDialog).toContainText(texts.broadcast_error.wrong_safe_storage_password, {
      timeout: HYDRATION_TIMEOUT
    });
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SESSION_TIME_CHOICE_KEY)).toBeNull();
    expect(workerUrls.slice(workersBefore).filter((url) => url.includes('idle=3600'))).toEqual([]);

    await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await signInButton(loginForm, texts).click();
    await expectSignedIn(loginForm, texts);
    expect(workerUrls.at(-1)).toContain('idle=3600');
    expect(await page.evaluate((key) => window.localStorage.getItem(key), SESSION_TIME_CHOICE_KEY)).not.toBeNull();
  });
});

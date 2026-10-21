import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { TIMEOUTS } from '../support/constants';
import type { User } from '@smart-signer/types/common';
import enSmartSigner from '@smart-signer/locales/en/smart-signer.json';

/**
 * With a signing extension in the page the login dialog's first page offers it above the safe
 * storage form: Keychain signs the login with the posting key from the username alone. Keychain
 * is a stub of `window.hive_keychain` that records the transactions it signs; the fixture app
 * signs in on the client only, so the sign-in replays (see the client-only sign-in recipe in
 * CLAUDE.md).
 *
 * Fixtures: reuses `accountSwitchLogout`, which signs `gtg` in on the same page.
 */

test.use({ fixtureTestName: 'accountSwitchLogout' });

const USERNAME = 'gtg';
// A page with the site header but no feed, to keep the recording small
const PAGE_WITH_HEADER = '/faq.html';
// The sign-in loads the signing stack (wax, the hb-auth worker) first
const SIGN_IN_TIMEOUT_MS = 30_000;
const EN_EXTENSION_SIGN_IN = enSmartSigner.login_form.extension_sign_in;
const EN_SAFE_STORAGE = enSmartSigner.login_form.signin_safe_storage;

/** A well-formed (65-byte, hex) signature; verify_authority is stubbed, so it need not be valid. */
const KEYCHAIN_SIGNATURE = `1f${'ab'.repeat(64)}`;

interface IKeychainSignTxCall {
  account: string;
  role: string;
}

const SIGN_TX_CALLS_GLOBAL = '__loginKeychainSignTxCalls';

async function installKeychainStub(page: Page): Promise<void> {
  await page.addInitScript(
    ({ signature, callsGlobal }) => {
      type Callback = (response: { success: boolean; result: unknown }) => void;
      const calls: IKeychainSignTxCall[] = [];
      Reflect.set(window, callsGlobal, calls);
      Reflect.set(window, 'hive_keychain', {
        requestSignBuffer: (_account: string, _message: string, _role: string, callback: Callback) =>
          callback({ success: true, result: signature }),
        requestSignTx: (account: string, tx: object, role: string, callback: Callback) => {
          calls.push({ account, role });
          callback({ success: true, result: { ...tx, signatures: [signature] } });
        }
      });
    },
    { signature: KEYCHAIN_SIGNATURE, callsGlobal: SIGN_TX_CALLS_GLOBAL }
  );
}

const keychainSignTxCalls = (page: Page): Promise<IKeychainSignTxCall[]> =>
  page.evaluate((callsGlobal) => Reflect.get(window, callsGlobal), SIGN_TX_CALLS_GLOBAL);

async function openLoginDialog(page: Page): Promise<LoginForm> {
  const homePage = new HomePage(page);
  const loginForm = new LoginForm(page);
  await page.goto(PAGE_WITH_HEADER, { waitUntil: 'domcontentloaded' });
  await expect(homePage.loginBtn).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await homePage.loginBtn.click();
  await expect(loginForm.usernameInput).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  return loginForm;
}

async function readStoredUser(page: Page): Promise<Partial<User>> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('user') || '{}'));
}

test.describe('Login dialog — extension sign-in on the first page', () => {
  test('LOGIN-EXT-01 — Keychain signs in from the username alone with the posting key', async ({ page }) => {
    await installKeychainStub(page);
    // The stub's signature is no key of the account: verify_authority is stubbed
    await installBroadcastInterceptor(page);
    const loginForm = await openLoginDialog(page);
    const keychainButton = page.getByRole('button', { name: EN_EXTENSION_SIGN_IN.keychain });

    await expect(keychainButton).toBeVisible();
    await expect(loginForm.passwordInput).toBeVisible();
    await expect(loginForm.otherSignInOptionsButton).toBeVisible();

    await loginForm.usernameInput.fill(USERNAME);
    await loginForm.usernameInput.press('Tab');
    await expect(keychainButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect
      .poll(() => readStoredUser(page), { timeout: SIGN_IN_TIMEOUT_MS })
      .toMatchObject({ username: USERNAME, loginType: 'keychain', keyType: 'posting' });
    await expect(loginForm.loginDialog).toBeHidden();
    expect(await keychainSignTxCalls(page)).toEqual([
      expect.objectContaining({ account: USERNAME, role: expect.stringMatching(/^posting$/i) })
    ]);
  });

  test('LOGIN-EXT-02 — the username typed on the first page carries over to other sign in options', async ({
    page
  }) => {
    await installKeychainStub(page);
    const loginForm = await openLoginDialog(page);

    await loginForm.usernameInput.fill(USERNAME);
    await loginForm.otherSignInOptionsButton.click();

    await expect(loginForm.otherSignInOptionsUsernameInput).toHaveValue(USERNAME);
    await expect(loginForm.hiveKeychainExtensionButton).toBeEnabled();
  });

  test('LOGIN-EXT-03 — PeakVault is offered on the first page', async ({ page }) => {
    await page.addInitScript(() => Reflect.set(window, 'peakvault', {}));
    await openLoginDialog(page);

    await expect(page.getByRole('button', { name: EN_EXTENSION_SIGN_IN.peakvault })).toBeVisible();
    await expect(page.getByRole('button', { name: EN_EXTENSION_SIGN_IN.keychain })).toHaveCount(0);
  });

  test('LOGIN-EXT-04 — without an extension the first page offers none', async ({ page }) => {
    const loginForm = await openLoginDialog(page);

    await expect(loginForm.saveSignInButton).toBeVisible();
    await expect(page.getByTestId('extension-sign-in')).toHaveCount(0);
  });

  test('LOGIN-EXT-05 — Direct Authority Mode is scoped to safe storage and absent from other sign in options', async ({
    page
  }) => {
    await installKeychainStub(page);
    const loginForm = await openLoginDialog(page);
    const strictMode = page.getByTestId('strict-mode');

    await expect(page.getByRole('button', { name: EN_EXTENSION_SIGN_IN.keychain })).toBeVisible();
    await expect(strictMode.getByRole('checkbox', { name: EN_SAFE_STORAGE.strict_mode })).toBeChecked();
    await expect(page.getByTestId('strict-mode-scope')).toHaveText(EN_SAFE_STORAGE.strict_mode_scope);
    await page.getByTestId('strict-mode-info').focus();
    await expect(page.getByTestId('strict-mode-info-content')).toHaveText(
      EN_SAFE_STORAGE.strict_mode_tooltip
    );

    await loginForm.otherSignInOptionsButton.click();
    await expect(loginForm.hiveKeychainExtensionButton).toBeVisible();
    await expect(strictMode).toHaveCount(0);
  });
});

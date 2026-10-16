import type { Server } from 'node:http';
import { test, expect, type Page } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { LoginForm } from '../support/pages/loginForm';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { installKeychainStub, keychainCalls } from '../support/keychainStub';
import { STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';
import type { User } from '@smart-signer/types/common';
import enSmartSigner from '@smart-signer/locales/en/smart-signer.json';

/**
 * With a signing extension in the page the login dialog's first page offers it above the safe
 * storage form: Keychain signs the login with the wallet's active key from the username alone.
 * Keychain is a stub (support/keychainStub.ts) and the API node is the stub node, which accepts
 * the stub's signature in `verify_authority`.
 */

const HYDRATION_TIMEOUT = 30_000;
const EN_EXTENSION_SIGN_IN = enSmartSigner.login_form.extension_sign_in;

let stub: Server;

test.beforeAll(async () => {
  stub = await startWalletApiStub(FIXTURE_API_PORT, {
    'database_api.verify_authority': () => ({ valid: true })
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

async function openLoginDialog(page: Page): Promise<LoginForm> {
  const loginForm = new LoginForm(page);
  await page.goto(`${WALLET_BASE_PATH}/market`);
  await expect(async () => {
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await expect(loginForm.usernameInput).toBeVisible({ timeout: HYDRATION_TIMEOUT });
  return loginForm;
}

async function readStoredUser(page: Page): Promise<Partial<User>> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('user') || '{}'));
}

test.describe('Extension sign-in on the first page of the login dialog', () => {
  test('WALLET-EXT-LOGIN-01 — Keychain signs in from the username alone with the active key', async ({ page }) => {
    await installKeychainStub(page, {});
    const loginForm = await openLoginDialog(page);
    const keychainButton = page.getByRole('button', { name: EN_EXTENSION_SIGN_IN.keychain });

    await expect(keychainButton).toBeVisible();
    await expect(loginForm.passwordInput).toBeVisible();
    await loginForm.usernameInput.fill(STUB_ACCOUNT);

    await loginForm.usernameInput.press('Tab');
    await expect(keychainButton).toBeFocused();
    await page.keyboard.press('Enter');

    await expect
      .poll(() => readStoredUser(page), { timeout: HYDRATION_TIMEOUT })
      .toMatchObject({ username: STUB_ACCOUNT, loginType: 'keychain', keyType: 'active' });
    await expect(loginForm.loginDialog).toBeHidden();

    const signTxCalls = (await keychainCalls(page)).filter(({ method }) => method === 'requestSignTx');
    expect(signTxCalls).toHaveLength(1);
    expect(signTxCalls[0].args[0]).toBe(STUB_ACCOUNT);
    expect(String(signTxCalls[0].args[2]).toLowerCase()).toBe('active');
  });

  test('WALLET-EXT-LOGIN-02 — PeakVault is offered on the first page', async ({ page }) => {
    await page.addInitScript(() => Reflect.set(window, 'peakvault', {}));
    await openLoginDialog(page);

    await expect(page.getByRole('button', { name: EN_EXTENSION_SIGN_IN.peakvault })).toBeVisible();
    await expect(page.getByRole('button', { name: EN_EXTENSION_SIGN_IN.keychain })).toHaveCount(0);
  });

  test('WALLET-EXT-LOGIN-03 — without an extension the first page offers none', async ({ page }) => {
    const loginForm = await openLoginDialog(page);

    await expect(loginForm.saveSignInButton).toBeVisible();
    await expect(page.getByTestId('extension-sign-in')).toHaveCount(0);
  });
});

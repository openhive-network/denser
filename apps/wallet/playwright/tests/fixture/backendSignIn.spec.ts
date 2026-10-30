import type { Server } from 'node:http';
import { test, expect, type Page, type Request } from '@playwright/test';
import { WALLET_BASE_PATH } from '../support/basePath';
import { LoginForm } from '../support/pages/loginForm';
import { FIXTURE_API_PORT } from '../support/apiStub';
import { installKeychainStub } from '../support/keychainStub';
import { STUB_ACCOUNT, startWalletApiStub } from '../support/walletApiStub';
import type { User } from '@smart-signer/types/common';
import enSmartSigner from '@smart-signer/locales/en/smart-signer.json';

/**
 * The login dialog signs in on the server when the site sets `LOGIN_AUTHENTICATE_ON_BACKEND=yes`,
 * as the blog's does: blog and wallet share the stored user on one origin, and the blog's Matrix
 * chat is only for a user the server signed in. The setting is appended to `__ENV.js`, as the
 * blog's chatSettings.ts does; Keychain is a stub and the stub node accepts its signature.
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

async function authenticateOnBackend(page: Page): Promise<void> {
  await page.route('**/__ENV.js?*', async (route) => {
    const response = await route.fetch();
    const assignment = 'window.__ENV.REACT_APP_LOGIN_AUTHENTICATE_ON_BACKEND = "yes";';
    await route.fulfill({ response, body: `${await response.text()}\n${assignment}` });
  });
}

/** The sign-in requests `page` sends to the wallet's login route from now on */
function recordLoginRequests(page: Page): Request[] {
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith(`${WALLET_BASE_PATH}/api/auth/login`)) {
      requests.push(request);
    }
  });
  return requests;
}

async function signInWithKeychain(page: Page): Promise<void> {
  await installKeychainStub(page, {});
  const loginForm = new LoginForm(page);
  await page.goto(`${WALLET_BASE_PATH}/market`);
  await expect(async () => {
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(loginForm.loginDialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: HYDRATION_TIMEOUT });
  await loginForm.usernameInput.fill(STUB_ACCOUNT);
  await page.getByRole('button', { name: EN_EXTENSION_SIGN_IN.keychain }).click();
  await expect(loginForm.loginDialog).toBeHidden({ timeout: HYDRATION_TIMEOUT });
}

async function readStoredUser(page: Page): Promise<Partial<User>> {
  return page.evaluate(() => JSON.parse(window.localStorage.getItem('user') || '{}'));
}

test.describe('Login dialog and LOGIN_AUTHENTICATE_ON_BACKEND', () => {
  test('WALLET-BACKEND-LOGIN-01 — with the setting on, the sign-in is a server session', async ({ page }) => {
    await authenticateOnBackend(page);
    const loginRequests = recordLoginRequests(page);

    await signInWithKeychain(page);

    expect(loginRequests).toHaveLength(1);
    expect(loginRequests[0].postDataJSON()).toMatchObject({ username: STUB_ACCOUNT, authenticateOnBackend: true });
    const response = await loginRequests[0].response();
    expect(response?.status()).toBe(200);
    expect(await response?.json()).toMatchObject({ username: STUB_ACCOUNT, authenticateOnBackend: true });
    await expect
      .poll(() => readStoredUser(page), { timeout: HYDRATION_TIMEOUT })
      .toMatchObject({ username: STUB_ACCOUNT, isLoggedIn: true, authenticateOnBackend: true });
  });

  test('WALLET-BACKEND-LOGIN-02 — with the setting off, the sign-in stays client-only', async ({ page }) => {
    const loginRequests = recordLoginRequests(page);

    await signInWithKeychain(page);

    await expect
      .poll(() => readStoredUser(page), { timeout: HYDRATION_TIMEOUT })
      .toMatchObject({ username: STUB_ACCOUNT, isLoggedIn: true, authenticateOnBackend: false });
    expect(loginRequests).toHaveLength(0);
  });
});

import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { TIMEOUTS } from '../support/constants';
import enSmartSigner from '@smart-signer/locales/en/smart-signer.json';

/**
 * Signing in with a Google account whose Google Drive holds no wallet ends at the "Wallet Not Found"
 * dialog: closing it, or going to Hive Bridge from it, ends that sign-in, so the user can sign in
 * again at once, and Google's consent is not asked for again on the way out.
 *
 * Google is stubbed: the app is configured with a client ID (`__ENV.js`), Google Identity Services
 * (`window.google`) grants consent at once and counts the requests for it, the token exchange
 * (`/api/google-drive/auth`) answers with an access token, and the Google Drive API finds no file.
 * The CSP of the fixture build, configured without Google, is bypassed for that.
 *
 * Tagged @basepath: .aidev/run-fixture-e2e.sh runs it a second time against a build served under
 * FIXTURE_BASE_PATH, where the token exchange has to be sent under the base path too.
 *
 * Fixtures: reuses `accountSwitchLogout`, which opens the sign-in dialog on the same page.
 */

test.use({ fixtureTestName: 'accountSwitchLogout', bypassCSP: true });

const BASE_PATH = process.env.FIXTURE_BASE_PATH ?? '';
const USERNAME = 'gtg';
// A page with the site header but no feed, to keep the recording small
const PAGE_WITH_HEADER = `${BASE_PATH}/faq.html`;
const TOKEN_EXCHANGE_PATH = `${BASE_PATH}/api/google-drive/auth`;
// The sign-in loads the signing stack (wax) first
const SIGN_IN_TIMEOUT_MS = 30_000;
const GOOGLE_CLIENT_ID = 'fixture-client.apps.googleusercontent.com';
const HIVE_BRIDGE_URL = 'https://auth.openhive.network/';
const CONSENT_REQUESTS_GLOBAL = '__googleConsentRequests';
const EN = enSmartSigner;

async function stubGoogle(page: Page): Promise<void> {
  await page.route('**/__ENV.js?*', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({
      response,
      body: `${body}\nwindow.__ENV.REACT_APP_GOOGLE_DRIVE_CLIENT_ID = ${JSON.stringify(GOOGLE_CLIENT_ID)};`
    });
  });
  await page.route('https://accounts.google.com/**', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: '' })
  );
  await page.route('**/api/google-drive/auth', (route) => route.fulfill({ json: { accessToken: 'access-token' } }));
  await page.route('https://www.googleapis.com/**', (route) => route.fulfill({ json: { files: [] } }));
  await page.context().route(`${HIVE_BRIDGE_URL}**`, (route) => route.fulfill({ contentType: 'text/html', body: '' }));
  await page.addInitScript((requestsGlobal) => {
    Reflect.set(window, requestsGlobal, 0);
    Reflect.set(window, 'google', {
      accounts: {
        oauth2: {
          initCodeClient: (config: { callback: (response: { code: string }) => void }) => ({
            requestCode: () => {
              Reflect.set(window, requestsGlobal, Reflect.get(window, requestsGlobal) + 1);
              config.callback({ code: 'authorization-code' });
            }
          })
        }
      }
    });
  }, CONSENT_REQUESTS_GLOBAL);
}

const consentRequests = (page: Page): Promise<number> =>
  page.evaluate((requestsGlobal) => Reflect.get(window, requestsGlobal), CONSENT_REQUESTS_GLOBAL);

async function openGoogleSignIn(page: Page): Promise<LoginForm> {
  const homePage = new HomePage(page);
  const loginForm = new LoginForm(page);
  await page.goto(PAGE_WITH_HEADER, { waitUntil: 'domcontentloaded' });
  await expect(homePage.loginBtn).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await homePage.loginBtn.click();
  await expect(loginForm.usernameInput).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await loginForm.usernameInput.fill(USERNAME);
  await loginForm.otherSignInOptionsButton.click();
  await expect(page.getByTestId('google-button')).toBeEnabled();
  return loginForm;
}

function walletNotFoundDialog(page: Page) {
  return page.getByRole('dialog', { name: EN.google_drive_error.wallet_not_found_title });
}

async function signInWithGoogle(page: Page): Promise<void> {
  await page.getByTestId('google-button').click();
  await expect(walletNotFoundDialog(page)).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
}

/** Signing in again reaches Google Drive again instead of being refused as pending */
async function expectSignInAgainAllowed(page: Page): Promise<void> {
  await signInWithGoogle(page);
  await expect(page.getByText(EN.login_form.sign_in_pending)).toHaveCount(0);
  await expect(page.getByText(EN.login_form.sign_in_pending_generic)).toHaveCount(0);
}

test.describe('Google sign-in — Wallet Not Found', { tag: '@basepath' }, () => {
  test.beforeEach(async ({ page }) => {
    await stubGoogle(page);
  });

  test('GOOGLE-WNF-01 — Cancel ends the sign-in without asking for Google consent again', async ({ page }) => {
    await openGoogleSignIn(page);
    await signInWithGoogle(page);

    await walletNotFoundDialog(page).getByRole('button', { name: EN.login_form.cancel_button }).click();

    await expect(walletNotFoundDialog(page)).toBeHidden();
    await expect(page.getByTestId('google-button')).toBeEnabled();
    expect(await consentRequests(page)).toBe(1);

    await expectSignInAgainAllowed(page);
    expect(await consentRequests(page)).toBe(2);
  });

  test('GOOGLE-WNF-02 — going to Hive Bridge ends the sign-in, so it can be retried at once', async ({ page }) => {
    await openGoogleSignIn(page);
    await signInWithGoogle(page);

    const bridgePage = page.waitForEvent('popup');
    await walletNotFoundDialog(page).getByRole('button', { name: EN.google_drive_error.go_to_bridge }).click();
    expect((await bridgePage).url()).toBe(HIVE_BRIDGE_URL);

    await expect(walletNotFoundDialog(page)).toBeHidden();
    expect(await consentRequests(page)).toBe(1);
    await expectSignInAgainAllowed(page);
  });

  test('GOOGLE-WNF-03 — the token exchange is sent to the app API under its base path', async ({ page }) => {
    await openGoogleSignIn(page);
    const tokenExchange = page.waitForRequest('**/api/google-drive/auth');
    await signInWithGoogle(page);

    const request = await tokenExchange;
    const origin = new URL(page.url()).origin;
    expect(request.method()).toBe('POST');
    expect(request.url()).toBe(`${origin}${TOKEN_EXCHANGE_PATH}`);
  });
});

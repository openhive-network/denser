import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { LoginForm } from '../support/pages/loginForm';
import { TIMEOUTS } from '../support/constants';

/**
 * The standalone /login page loads Google Identity Services only when the form offers Google
 * ("Other sign in options"), not with the page: its consent popup has to open within the click on
 * the Google button, so the script is loaded as soon as that button shows.
 *
 * Google is stubbed: the app is configured with a client ID (`__ENV.js`) and the script requests
 * are answered with a stand-in for it and counted. The CSP of the fixture build, configured
 * without Google, is bypassed for that.
 *
 * Fixtures: reuses `accountSwitchLogout`, which opens the sign-in form.
 */

test.use({ fixtureTestName: 'accountSwitchLogout', bypassCSP: true });

const USERNAME = 'gtg';
const GOOGLE_CLIENT_ID = 'fixture-client.apps.googleusercontent.com';
// Defines what the Google Drive signer calls
const GOOGLE_SCRIPT_STUB =
  'window.google = { accounts: { oauth2: { initCodeClient: () => ({ requestCode() {} }) } } };';

/** Configures the app with a Google client ID; returns the count of requests for Google's script */
async function configureGoogle(page: Page): Promise<() => number> {
  let scriptRequests = 0;
  await page.route('**/__ENV.js?*', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({
      response,
      body: `${body}\nwindow.__ENV.REACT_APP_GOOGLE_DRIVE_CLIENT_ID = ${JSON.stringify(GOOGLE_CLIENT_ID)};`
    });
  });
  await page.route('https://accounts.google.com/**', (route) => {
    scriptRequests += 1;
    return route.fulfill({ contentType: 'text/javascript', body: GOOGLE_SCRIPT_STUB });
  });
  return () => scriptRequests;
}

test.describe('Login page — Google script', () => {
  test('LOGIN-GSI-01 — the Google script loads once the Google option is offered, not with the page', async ({
    page
  }) => {
    const googleScriptRequests = await configureGoogle(page);
    const loginForm = new LoginForm(page);

    await page.goto('/login');
    await expect(loginForm.usernameInput).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(page.getByTestId('sign-in-form-shell')).toHaveCount(0);
    expect(googleScriptRequests()).toBe(0);

    await loginForm.usernameInput.fill(USERNAME);
    await loginForm.otherSignInOptionsButton.click();
    await expect(page.getByTestId('google-button')).toBeEnabled();
    await expect.poll(googleScriptRequests).toBe(1);
  });
});

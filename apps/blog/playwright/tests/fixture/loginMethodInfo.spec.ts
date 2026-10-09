import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { TIMEOUTS } from '../support/constants';
import enSmartSigner from '@smart-signer/locales/en/smart-signer.json';
import plSmartSigner from '@smart-signer/locales/pl/smart-signer.json';

/**
 * Sign-in method help: every method in the login dialog has an info trigger whose tooltip
 * describes it, and the dialog's copy comes from the smart-signer locale files.
 *
 * Opens the dialog from the trending feed and reads no other chain data, so it reuses the
 * trending feed recording.
 */

test.use({ fixtureTestName: 'homeMainPage' });

const EN_METHOD_INFO = enSmartSigner.login_form.method_info;
const OTHER_METHODS = ['metamask', 'google', 'keychain', 'peakvault', 'wif', 'hiveauth', 'hivesigner'] as const;

const openLoginDialog = async (page: Page): Promise<LoginForm> => {
  const homePage = new HomePage(page);
  const loginForm = new LoginForm(page);
  await page.goto('/trending', { waitUntil: 'domcontentloaded' });
  await expect(homePage.loginBtn).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  await homePage.loginBtn.click();
  await expect(loginForm.usernameInput).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  return loginForm;
};

/** Focuses a method's info trigger (opening its tooltip without a hover delay); returns the tooltip. */
const openMethodInfo = async (page: Page, method: string) => {
  await page.getByTestId(`method-info-${method}`).focus();
  return page.getByTestId(`method-info-${method}-content`);
};

test.describe('Login dialog — sign-in method info', () => {
  test('LOGIN-INFO-01 — Safe Storage has an info tooltip that does not submit the form', async ({ page }) => {
    const loginForm = await openLoginDialog(page);

    await expect(await openMethodInfo(page, 'safe_storage')).toHaveText(EN_METHOD_INFO.safe_storage);
    await expect(page.getByTestId('method-info-safe_storage')).toHaveAccessibleName('What is Safe Storage?');

    // A submit would validate the empty form and show the username error.
    await page.getByTestId('method-info-safe_storage').click();
    await expect(loginForm.usernameErrorMessage).toBeHidden();
    await expect(loginForm.saveSignInButton).toBeVisible();
  });

  test('LOGIN-INFO-02 — every other sign-in method has an info tooltip from the en locale', async ({ page }) => {
    const loginForm = await openLoginDialog(page);
    await loginForm.otherSignInOptionsButton.click();
    await expect(loginForm.otherSignInOptionsDescription).toBeVisible();

    for (const method of OTHER_METHODS) {
      await expect(await openMethodInfo(page, method), method).toHaveText(EN_METHOD_INFO[method]);
    }

    // The trigger sits beside the WIF button, not in it: clicking it must not start the WIF sign-in.
    await loginForm.otherSignInOptionsUsernameInput.fill('guest4test');
    await page.getByTestId('method-info-wif').click();
    await expect(loginForm.headerEnterYourWifKey).toBeHidden();
    await expect(loginForm.otherSignInOptionsDescription).toBeVisible();
  });

  test('LOGIN-INFO-03 — the Direct Authority Mode label and help follow the UI language', async ({
    page,
    baseURL
  }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'pl', url: baseURL ?? '' }]);
    await openLoginDialog(page);

    const plSafeStorage = plSmartSigner.login_form.signin_safe_storage;
    expect(plSafeStorage.strict_mode).not.toBe(enSmartSigner.login_form.signin_safe_storage.strict_mode);
    await expect(page.locator('label[for="strict"]')).toHaveText(plSafeStorage.strict_mode);
    await expect(await openMethodInfo(page, 'safe_storage')).toHaveText(
      plSmartSigner.login_form.method_info.safe_storage
    );
  });
});

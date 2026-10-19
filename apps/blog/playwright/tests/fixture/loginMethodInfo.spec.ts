import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { TIMEOUTS } from '../support/constants';
import enSmartSigner from '@smart-signer/locales/en/smart-signer.json';
import plSmartSigner from '@smart-signer/locales/pl/smart-signer.json';
import enBlog from '../../../locales/en/common_blog.json';
import plBlog from '../../../locales/pl/common_blog.json';

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

  test('LOGIN-INFO-04 — in Polish the sign-in dialog shows no English', async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: 'NEXT_LOCALE', value: 'pl', url: baseURL ?? '' }]);
    const loginForm = await openLoginDialog(page);
    const en = enSmartSigner.login_form;
    const pl = plSmartSigner.login_form;

    // The visually hidden title is the dialog's accessible name, which screen readers announce.
    const dialog = page.getByRole('dialog', { name: plBlog.login_form.dialog_title });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAccessibleDescription(plBlog.login_form.dialog_description);
    await expect(dialog).toContainText(pl.signin_safe_storage.title);
    await expect(loginForm.saveSignInButton).toHaveText(pl.signin_safe_storage.button_save);
    await expect(loginForm.otherSignInOptionsButton).toHaveText(pl.other_signin_options);
    await expect(loginForm.usernameInput).toHaveAttribute('placeholder', pl.signin_safe_storage.placeholder_username);
    await expect(page.getByTestId('password-input')).toHaveAttribute(
      'placeholder',
      pl.signin_safe_storage.placeholder_password
    );
    await expect(page.getByTestId('method-info-safe_storage')).toHaveAccessibleName(
      pl.method_info.label.replace('{{method}}', pl.safe_storage_name)
    );
    for (const english of [
      enBlog.login_form.dialog_title,
      en.signin_safe_storage.title,
      en.signin_safe_storage.button_save,
      en.other_signin_options
    ]) {
      await expect(dialog, english).not.toContainText(english);
    }

    await loginForm.otherSignInOptionsButton.click();
    await expect(loginForm.otherSignInOptionsDescription).toHaveText(pl.other_signing_options_description);
    const methods = [
      pl.other_signin_options,
      pl.signin_with_metamask,
      pl.signin_with_google,
      pl.signin_with_keychain,
      pl.signin_with_peakvault,
      pl.signin_with_wif,
      pl.go_back_button
    ];
    for (const text of methods) await expect(dialog, text).toContainText(text);
    for (const english of [
      en.other_signin_options,
      en.signin_with_metamask,
      en.signin_with_google,
      en.signin_with_keychain,
      en.signin_with_wif,
      en.go_back_button
    ]) {
      await expect(dialog, english).not.toContainText(english);
    }
  });
});

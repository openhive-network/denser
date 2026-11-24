import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { FIXTURE_POSTING_WIF } from '../support/fixture-auth/constants';
import {
  ACCOUNT,
  answerKeyReferences,
  giveKeyRole,
  openAddAccountDialog,
  openAddNewKey,
  OTHER_ACCOUNT,
  PAGE_WITH_HEADER,
  SIGN_IN_TIMEOUT_MS,
  storeAccount,
  type KeyRole
} from '../support/safeStorageContext';

/**
 * The safe-storage sign-in's password and key rules. A new wallet's password is at most 512
 * characters, said in the page's language; an existing wallet's is checked against no maximum, so
 * a longer one reaches safe storage, which answers a wrong one. A password error is dropped once
 * the field is emptied or the account changes. A key of the wrong role is refused as its field
 * loses focus, in the sign-in form as in "Add new key", before anything is submitted.
 *
 * Fixtures: reuses `accountSwitchLogout` (read-only on replay), whose add-account dialog it opens,
 * as safeStorageLoginKeyRole.spec.ts.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- safeStoragePasswordRules
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchLogout recording');
test.use({ fixtureTestName: 'accountSwitchLogout', authenticatedUser: { authenticateOnBackend: true } });

const MAX_PASSWORD_LENGTH = 512;
const TOO_LONG = [
  { locale: 'en', message: 'Password must be at most 512 characters long.' },
  { locale: 'pl', message: 'Hasło może mieć najwyżej 512 znaków.' }
];
const WRONG_PASSWORD = 'Wrong safe storage password. Enter the password you set for safe storage and try again.';
const ACTIVE_KEY_ERROR = "This key doesn't have posting authority. Blog sign-in requires the posting key.";

const longPassword = (length: number) => 'ab'.repeat(length).slice(0, length);

test.describe('Safe-storage password and key rules', () => {
  for (const { locale, message } of TOO_LONG) {
    test(`BLOG-SAFE-STORAGE-PASSWORD-01-${locale} — a new wallet's password over the limit is refused in the page's language`, async ({
      page,
      baseURL
    }) => {
      // The key is checked as its field loses focus: answered as the account's posting key
      await answerKeyReferences(page);
      await giveKeyRole(page, () => 'posting');
      await page.context().addCookies([{ name: 'NEXT_LOCALE', value: locale, url: baseURL ?? '' }]);
      await page.goto(PAGE_WITH_HEADER);

      const loginForm = await openAddAccountDialog(page);
      await expect(loginForm.wifInput).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
      await loginForm.usernameInput.fill(ACCOUNT);
      await loginForm.wifInput.fill(FIXTURE_POSTING_WIF);
      await loginForm.passwordInput.fill(longPassword(MAX_PASSWORD_LENGTH + 1));

      await expect(loginForm.passwordErrorMessage).toHaveText(message);
      await expect(loginForm.saveSignInButton).toBeDisabled();

      await loginForm.passwordInput.fill(longPassword(MAX_PASSWORD_LENGTH));
      await expect(loginForm.passwordErrorMessage).toHaveCount(0);

      await loginForm.passwordInput.fill('abc');
      await expect(loginForm.passwordErrorMessage).toBeVisible();
      await loginForm.passwordInput.fill('');
      await expect(loginForm.passwordErrorMessage).toHaveCount(0);
    });
  }

  test("BLOG-SAFE-STORAGE-PASSWORD-02 — an existing wallet's longer password reaches safe storage; the error goes with the account", async ({
    page
  }) => {
    // Safe storage signs its registration with a key that is not the account's: verify_authority is stubbed
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    await giveKeyRole(page, () => 'posting');
    await page.goto(PAGE_WITH_HEADER);
    await storeAccount(page);

    const loginForm = await openAddAccountDialog(page);
    await expect(loginForm.usernameInput).toHaveValue(ACCOUNT, { timeout: SIGN_IN_TIMEOUT_MS });
    await loginForm.passwordInput.fill(longPassword(1140));
    await expect(loginForm.passwordErrorMessage).toHaveCount(0);
    await loginForm.loginDialog.locator('[type="submit"]').click();

    const error = loginForm.loginDialog.getByTestId('safe-storage-error');
    await expect(error).toHaveText(WRONG_PASSWORD, { timeout: SIGN_IN_TIMEOUT_MS });

    await loginForm.usernameInput.fill(OTHER_ACCOUNT);
    await expect(error).toHaveCount(0);
  });

  test('BLOG-SAFE-STORAGE-KEY-BLUR-01 — a key of the wrong role is refused as the sign-in key field loses focus', async ({
    page
  }) => {
    await giveKeyRole(page, () => 'active');
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    await expect(loginForm.wifInput).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await loginForm.usernameInput.fill(ACCOUNT);
    await loginForm.wifInput.fill(FIXTURE_POSTING_WIF);
    await loginForm.wifInput.blur();

    await expect(loginForm.wifInputErrorMessage).toHaveText(ACTIVE_KEY_ERROR, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(loginForm.wifInput).toHaveValue(FIXTURE_POSTING_WIF);
  });

  test('BLOG-SAFE-STORAGE-KEY-BLUR-02 — a key of the wrong role is refused as the "Add new key" field loses focus', async ({
    page
  }) => {
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    let keyRole: KeyRole = 'posting';
    await giveKeyRole(page, () => keyRole);
    await page.goto(PAGE_WITH_HEADER);
    await storeAccount(page);

    keyRole = 'active';
    const updateKeyForm = await openAddNewKey(page);
    const wif = updateKeyForm.getByTestId('login-form-wif');
    await wif.fill(FIXTURE_POSTING_WIF);
    await wif.blur();

    await expect(updateKeyForm).toContainText(ACTIVE_KEY_ERROR, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(wif).toHaveValue(FIXTURE_POSTING_WIF);
  });
});

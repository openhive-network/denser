import type { Locator, Page } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { FIXTURE_POSTING_WIF } from '../support/fixture-auth/constants';
import {
  ACCOUNT,
  answerKeyReferences,
  answerNoKeyHolders,
  giveKeyRole,
  openAddAccountDialog,
  openAddNewKey,
  OTHER_ACCOUNT,
  PAGE_WITH_HEADER,
  SAFE_STORAGE_PASSWORD,
  SIGN_IN_TIMEOUT_MS,
  storeAccount,
  type KeyRole
} from '../support/safeStorageContext';

/**
 * The safe-storage sign-in and "Add new key" forms as a user meets them at the keyboard: each field
 * typed into a key at a time and left with Tab, not filled and blurred by script. A key without the
 * authority the sign-in needs is refused as its field, or the account field typed after it, loses
 * focus: the account's own key of another role, and a key nobody holds, which safe storage's own
 * verification would refuse on submit. Changing the account drops the refusal. A wrong-password
 * error goes once the password field is emptied, and an emptied field shows no other error.
 *
 * Fixtures: reuses `accountSwitchLogout` (read-only on replay), as safeStoragePasswordRules.spec.ts.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- safeStorageKeyboardChecks
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchLogout recording');
test.use({ fixtureTestName: 'accountSwitchLogout', authenticatedUser: { authenticateOnBackend: true } });

const KEY_ERROR = "This key doesn't have posting authority. Blog sign-in requires the posting key.";
const WRONG_PASSWORD = 'Wrong safe storage password. Enter the password you set for safe storage and try again.';
const PASSWORD_LENGTH = 'Password must be at least 6 characters long.';
const TYPING_DELAY_MS = 20;

/** Types `text` into `field` as a user does, replacing what it holds; leaves the focus in it */
async function typeInto(page: Page, field: Locator, text: string) {
  await field.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(text, { delay: TYPING_DELAY_MS });
}

test.describe('Safe-storage forms at the keyboard', () => {
  test('BLOG-SAFE-STORAGE-KEYBOARD-01 — a key nobody holds is refused on Tab; changing the account drops it', async ({
    page
  }) => {
    await giveKeyRole(page, () => null);
    await answerNoKeyHolders(page);
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    await expect(loginForm.wifInput).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await typeInto(page, loginForm.usernameInput, ACCOUNT);
    await page.keyboard.press('Tab');
    await page.keyboard.type(SAFE_STORAGE_PASSWORD, { delay: TYPING_DELAY_MS });
    await typeInto(page, loginForm.wifInput, FIXTURE_POSTING_WIF);
    await page.keyboard.press('Tab');

    await expect(loginForm.wifInputErrorMessage).toHaveText(KEY_ERROR, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(loginForm.wifInput).toHaveValue(FIXTURE_POSTING_WIF);

    await typeInto(page, loginForm.usernameInput, OTHER_ACCOUNT);
    await expect(loginForm.wifInputErrorMessage).toHaveCount(0);
  });

  test("BLOG-SAFE-STORAGE-KEYBOARD-02 — a key typed before the account is checked as the account field is left", async ({
    page
  }) => {
    await giveKeyRole(page, () => 'active');
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    await expect(loginForm.wifInput).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await typeInto(page, loginForm.usernameInput, '');
    await typeInto(page, loginForm.wifInput, FIXTURE_POSTING_WIF);
    await page.keyboard.press('Tab');
    await typeInto(page, loginForm.usernameInput, ACCOUNT);
    await expect(loginForm.wifInputErrorMessage).toHaveCount(0);
    await page.keyboard.press('Tab');

    await expect(loginForm.wifInputErrorMessage).toHaveText(KEY_ERROR, { timeout: SIGN_IN_TIMEOUT_MS });
  });

  test('BLOG-SAFE-STORAGE-KEYBOARD-03 — "Add new key" refuses a key nobody holds on Tab', async ({ page }) => {
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    let keyRole: KeyRole | null = 'posting';
    await giveKeyRole(page, () => keyRole);
    await page.goto(PAGE_WITH_HEADER);
    await storeAccount(page);

    keyRole = null;
    await answerNoKeyHolders(page);
    const updateKeyForm = await openAddNewKey(page);
    const wif = updateKeyForm.getByTestId('login-form-wif');
    await typeInto(page, wif, FIXTURE_POSTING_WIF);
    await page.keyboard.press('Tab');

    await expect(updateKeyForm).toContainText(KEY_ERROR, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(wif).toHaveValue(FIXTURE_POSTING_WIF);
  });

  test('BLOG-SAFE-STORAGE-KEYBOARD-04 — emptying the password field drops the wrong-password error', async ({
    page
  }) => {
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    await giveKeyRole(page, () => 'posting');
    await page.goto(PAGE_WITH_HEADER);
    await storeAccount(page);

    const loginForm = await openAddAccountDialog(page);
    await expect(loginForm.usernameInput).toHaveValue(ACCOUNT, { timeout: SIGN_IN_TIMEOUT_MS });
    await typeInto(page, loginForm.passwordInput, `${SAFE_STORAGE_PASSWORD}-wrong`);
    await loginForm.loginDialog.locator('[type="submit"]').click();

    const error = loginForm.loginDialog.getByTestId('safe-storage-error');
    await expect(error).toHaveText(WRONG_PASSWORD, { timeout: SIGN_IN_TIMEOUT_MS });

    await typeInto(page, loginForm.passwordInput, '');
    await expect(error).toHaveCount(0);
    await expect(loginForm.passwordErrorMessage).toHaveCount(0);
  });

  test('BLOG-SAFE-STORAGE-KEYBOARD-05 — "Add new key": an emptied password field shows no error', async ({
    page
  }) => {
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    await giveKeyRole(page, () => 'posting');
    await page.goto(PAGE_WITH_HEADER);
    await storeAccount(page);

    const updateKeyForm = await openAddNewKey(page);
    const password = updateKeyForm.getByTestId('login-form-password');
    await typeInto(page, password, `${SAFE_STORAGE_PASSWORD}-wrong`);
    await typeInto(page, updateKeyForm.getByTestId('login-form-wif'), FIXTURE_POSTING_WIF);
    await updateKeyForm.getByTestId('login-form-update-key').click();
    await expect(updateKeyForm).toContainText(WRONG_PASSWORD, { timeout: SIGN_IN_TIMEOUT_MS });

    await typeInto(page, password, '');
    await expect(updateKeyForm).not.toContainText(WRONG_PASSWORD);
    await expect(updateKeyForm).not.toContainText(PASSWORD_LENGTH);

    await page.keyboard.type('abc', { delay: TYPING_DELAY_MS });
    await expect(updateKeyForm).toContainText(PASSWORD_LENGTH);
  });
});

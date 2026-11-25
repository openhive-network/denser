import type { Page } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { FIXTURE_POSTING_WIF } from '../support/fixture-auth/constants';
import {
  ACCOUNT,
  answerNoKeyHolders,
  giveKeyRole,
  openAddAccountDialog,
  PAGE_WITH_HEADER,
  SIGN_IN_TIMEOUT_MS
} from '../support/safeStorageContext';

/**
 * The "Sign in with WIF (Legacy)" key dialog as a user meets it at the keyboard: a key without the
 * posting authority is refused as its field loses focus, with the inline error of the safe-storage
 * forms, and a refused key submitted leaves the dialog open with the key and the error. The key is
 * none of the account's own and no account holds it.
 *
 * Fixtures: reuses `accountSwitchLogout` (read-only on replay), as safeStorageKeyboardChecks.spec.ts.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- wifKeyDialogKeyboard
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchLogout recording');
test.use({ fixtureTestName: 'accountSwitchLogout', authenticatedUser: { authenticateOnBackend: true } });

const KEY_ERROR = "This key doesn't have posting authority. Blog sign-in requires the posting key.";
const TYPING_DELAY_MS = 20;

/** Resolves once the next lookup of a key's holders is sent */
function keyHolderLookup(page: Page) {
  return page.waitForRequest((request) => request.postData()?.includes('get_key_references') ?? false);
}

test.describe('WIF (Legacy) key dialog at the keyboard', () => {
  test('BLOG-WIF-KEY-KEYBOARD-01 — a key nobody holds is refused on Tab, and on submit the dialog stays open', async ({
    page
  }) => {
    await installBroadcastInterceptor(page);
    await giveKeyRole(page, () => null);
    await answerNoKeyHolders(page);
    await page.goto(PAGE_WITH_HEADER);

    const loginForm = await openAddAccountDialog(page);
    await loginForm.otherSignInOptionsButton.click();
    await loginForm.otherSignInOptionsUsernameInput.fill(ACCOUNT);
    await loginForm.signInWithWifButton.click();
    await expect(loginForm.headerEnterYourKey).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });

    await loginForm.postingPrivateKeyInput.click();
    await page.keyboard.type(FIXTURE_POSTING_WIF, { delay: TYPING_DELAY_MS });
    await page.keyboard.press('Tab');

    await expect(loginForm.passwordErrorMessageEnterYourWifKey).toHaveText(KEY_ERROR, {
      timeout: SIGN_IN_TIMEOUT_MS
    });
    await expect(loginForm.postingPrivateKeyInput).toHaveValue(FIXTURE_POSTING_WIF);

    const checked = keyHolderLookup(page);
    await loginForm.postingPrivateKeySubmitButton.click();
    await checked;
    await expect(loginForm.postingPrivateKeySubmitButton).toBeEnabled();
    await expect(loginForm.passwordErrorMessageEnterYourWifKey).toHaveText(KEY_ERROR);
    await expect(loginForm.headerEnterYourKey).toBeVisible();
    await expect(loginForm.postingPrivateKeyInput).toHaveValue(FIXTURE_POSTING_WIF);
    expect(await page.getByTestId('error-toast-content').count()).toBe(0);
  });
});

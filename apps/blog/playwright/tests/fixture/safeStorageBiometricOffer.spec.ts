import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { reportPasskeySupport } from '../support/liteSafeStorageContext';
import {
  ACCOUNT,
  answerKeyReferences,
  giveKeyRole,
  openAddAccountDialog,
  PAGE_WITH_HEADER,
  SAFE_STORAGE_PASSWORD,
  SIGN_IN_TIMEOUT_MS,
  storeAccount
} from '../support/safeStorageContext';

/**
 * After a password sign-in of an account safe storage holds, where the browser supports passkeys,
 * the Blog offers the biometric unlock in place of the sign-in form: on a phone viewport its
 * buttons are on screen without scrolling the dialog, and the form's sign-in button is gone, so it
 * is not pressed past the offer. Answering the offer finishes the sign-in.
 *
 * Fixtures: reuses `accountSwitchLogout` (read-only on replay), whose add-account dialog stores
 * ACCOUNT in safe storage, as safeStorageDirectAuthority.spec.ts.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- safeStorageBiometricOffer
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchLogout recording');
test.use({
  fixtureTestName: 'accountSwitchLogout',
  authenticatedUser: { authenticateOnBackend: true },
  viewport: { width: 393, height: 852 }
});

test.describe('Safe-storage biometric unlock offer', () => {
  test('BLOG-SAFE-STORAGE-BIOMETRIC-OFFER-01 — the offer replaces the form, on screen in a phone viewport', async ({
    page
  }) => {
    // Safe storage signs its registration with a key that is not the account's: verify_authority is stubbed
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    await giveKeyRole(page, () => 'posting');
    await reportPasskeySupport(page, true);
    await page.goto(PAGE_WITH_HEADER);
    await storeAccount(page);

    const loginForm = await openAddAccountDialog(page);
    await expect(loginForm.usernameInput).toHaveValue(ACCOUNT, { timeout: SIGN_IN_TIMEOUT_MS });
    await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await loginForm.loginDialog.locator('[type="submit"]').click();

    const prompt = loginForm.loginDialog.getByTestId('passkey-prompt');
    await expect(prompt).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    for (const button of ['passkey-prompt-enable', 'passkey-prompt-not-now', 'passkey-prompt-never']) {
      await expect(prompt.getByTestId(button)).toBeInViewport({ ratio: 1 });
    }
    await expect(loginForm.passwordInput).toHaveCount(0);
    await expect(loginForm.otherSignInOptionsButton).toHaveCount(0);

    await prompt.getByTestId('passkey-prompt-not-now').click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
  });
});

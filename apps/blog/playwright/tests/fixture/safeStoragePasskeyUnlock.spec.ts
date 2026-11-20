import type { CDPSession, Page } from '@playwright/test';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { HomePage } from '../support/pages/homePage';
import { LoginForm } from '../support/pages/loginForm';
import { ProfileUserMenu } from '../support/pages/profileUserMenu';
import { clickUntilOpen } from '../support/uiPrimitives';
import {
  ACCOUNT,
  answerKeyReferences,
  giveKeyRole,
  PAGE_WITH_HEADER,
  SAFE_STORAGE_PASSWORD,
  SIGN_IN_TIMEOUT_MS,
  storeAccount
} from '../support/safeStorageContext';

/**
 * The biometric unlock of safe storage with a platform passkey, here Chromium's virtual
 * authenticator (CDP WebAuthn, with PRF): enabled once after a password sign-in, it unlocks the
 * next sign-in after a sign-out without the password and without creating another passkey. A
 * cancelled creation finishes the password sign-in without the browser's error and is not offered
 * again at the next sign-in; an unlock the browser refuses leaves the password form, without a
 * message. The ceremonies themselves are covered by
 * packages/smart-signer/lib/passkey-unlock/passkey-unlock-ceremony.test.ts.
 *
 * Fixtures: reuses `accountSwitchLogout` (read-only on replay), whose add-account dialog stores
 * ACCOUNT in safe storage, as safeStorageBiometricOffer.spec.ts.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- safeStoragePasskeyUnlock
 */

test.skip(isRecordMode, 'replay-only: shares the accountSwitchLogout recording');
test.use({ fixtureTestName: 'accountSwitchLogout', authenticatedUser: { authenticateOnBackend: true } });

/** A platform authenticator with user verification and PRF, which answers without a user's touch */
async function addPlatformAuthenticator(page: Page): Promise<{ cdp: CDPSession; authenticatorId: string }> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      hasPrf: true,
      automaticPresenceSimulation: true
    }
  });
  return { cdp, authenticatorId };
}

async function passkeyCount(cdp: CDPSession, authenticatorId: string): Promise<number> {
  const { credentials } = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
  return credentials.length;
}

async function signOut(page: Page): Promise<void> {
  const homePage = new HomePage(page);
  const profileMenu = new ProfileUserMenu(page);
  await clickUntilOpen(homePage.profileAvatarButton, profileMenu.profileMenuContent);
  await profileMenu.logoutLink.click();
  await expect(homePage.loginBtn).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
}

async function openSignIn(page: Page): Promise<LoginForm> {
  await new HomePage(page).loginBtn.click();
  return new LoginForm(page);
}

/** Signs ACCOUNT in with the safe storage password and waits for the biometric unlock offer */
async function signInWithPassword(page: Page) {
  const loginForm = await openSignIn(page);
  await expect(loginForm.usernameInput).toHaveValue(ACCOUNT, { timeout: SIGN_IN_TIMEOUT_MS });
  await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
  await loginForm.signInButton.click();
  const prompt = loginForm.loginDialog.getByTestId('passkey-prompt');
  await expect(prompt).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
  return { loginForm, prompt };
}

test.describe('Safe-storage passkey unlock', () => {
  test.beforeEach(async ({ page }) => {
    // Safe storage signs its registration with a key that is not the account's: verify_authority is stubbed
    await installBroadcastInterceptor(page);
    await answerKeyReferences(page);
    await giveKeyRole(page, () => 'posting');
    await page.goto(PAGE_WITH_HEADER);
    await storeAccount(page);
    await signOut(page);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-01 — enabled once, the passkey unlocks the next sign-in without a new one', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);

    const { loginForm, prompt } = await signInWithPassword(page);
    await prompt.getByTestId('passkey-prompt-enable').click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);

    await signOut(page);
    await openSignIn(page);
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(new HomePage(page).profileAvatarButton).toBeVisible();
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-02 — a cancelled passkey creation signs in with the password, without the browser error, and is not offered again at once', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    // The user verification the creation needs fails, as Cancel in the browser's prompt: NotAllowedError
    await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false });

    const { loginForm, prompt } = await signInWithPassword(page);
    await prompt.getByTestId('passkey-prompt-enable').click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(page.getByText(/not allowed|webauthn|Passkey creation/i)).toHaveCount(0);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(0);

    await signOut(page);
    const next = await openSignIn(page);
    await expect(next.usernameInput).toHaveValue(ACCOUNT, { timeout: SIGN_IN_TIMEOUT_MS });
    await next.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await next.signInButton.click();
    await expect(next.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await passkeyCount(cdp, authenticatorId)).toBe(0);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-03 — a passkey unlock that fails falls back to the password form quietly, without a new passkey', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await prompt.getByTestId('passkey-prompt-enable').click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    // The passkey is gone from the authenticator: the browser answers NotAllowedError, as for a cancel
    await cdp.send('WebAuthn.clearCredentials', { authenticatorId });

    await signOut(page);
    const next = await openSignIn(page);
    await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(next.passwordInput).toBeVisible();
    await next.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await next.signInButton.click();
    await expect(next.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await passkeyCount(cdp, authenticatorId)).toBe(0);
  });
});

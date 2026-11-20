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
 * again at the next sign-in. A passkey deleted from the authenticator, or a record it no longer
 * decrypts (which is removed), leaves the password form, without a message, and the offer returns
 * after the password; enabling again replaces the passkey. The ceremonies themselves are covered by
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

type RecordChange = 'read' | 'corrupt' | 'as-hb-auth';

/**
 * Whether hb-auth's passkey record store, the `/passkeys_v3` IndexedDB the app writes, holds
 * `username`'s record, after `change`: spoiling its password, or dropping `transports`, which
 * hb-auth's records lack
 */
function withPasskeyStore<T>(page: Page, change: RecordChange, username: string): Promise<T> {
  return page.evaluate(
    ([change, username]) =>
      new Promise<T>((resolve, reject) => {
        const open = indexedDB.open('/passkeys_v3', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const transaction = open.result.transaction('credentials', 'readwrite');
          const store = transaction.objectStore('credentials');
          const read = store.get(username);
          let result: T;
          read.onsuccess = () => {
            const record = read.result;
            if (change === 'corrupt' && record) {
              record.encryptedPassword = record.encryptedPassword.map((byte: number) => byte ^ 0xff);
              store.put(record);
            }
            if (change === 'as-hb-auth' && record) {
              delete record.transports;
              store.put(record);
            }
            result = Boolean(record) as T;
          };
          transaction.oncomplete = () => {
            open.result.close();
            resolve(result);
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    [change, username] as const
  );
}

/** Spoils the password `username`'s passkey record holds, which its passkey then no longer decrypts */
async function corruptPasskeyRecord(page: Page, username: string): Promise<void> {
  expect(await withPasskeyStore<boolean>(page, 'corrupt', username)).toBe(true);
}

const hasPasskeyRecord = (page: Page, username: string) => withPasskeyStore<boolean>(page, 'read', username);

/** Turns `username`'s passkey record into one hb-auth wrote, without `transports` */
async function writeAsHbAuth(page: Page, username: string): Promise<void> {
  expect(await withPasskeyStore<boolean>(page, 'as-hb-auth', username)).toBe(true);
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

  test('BLOG-SAFE-STORAGE-PASSKEY-03 — a passkey deleted from the authenticator falls back to the password once, and the offer returns', async ({
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
    await next.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await next.signInButton.click();
    const offer = next.loginDialog.getByTestId('passkey-prompt');
    await expect(offer).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await offer.getByTestId('passkey-prompt-enable').click();
    await expect(next.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);

    await signOut(page);
    await openSignIn(page);
    await expect(next.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(new HomePage(page).profileAvatarButton).toBeVisible();
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-04 — a record that no longer decrypts is cleared, and enabling again leaves one passkey', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await prompt.getByTestId('passkey-prompt-enable').click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    await corruptPasskeyRecord(page, ACCOUNT);

    await signOut(page);
    const next = await openSignIn(page);
    await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(false);
    await next.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await next.signInButton.click();
    const offer = next.loginDialog.getByTestId('passkey-prompt');
    await expect(offer).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await offer.getByTestId('passkey-prompt-enable').click();
    await expect(next.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(true);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-05 — a record hb-auth wrote, without transports, still unlocks the sign-in', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await prompt.getByTestId('passkey-prompt-enable').click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    await writeAsHbAuth(page, ACCOUNT);

    await signOut(page);
    await openSignIn(page);
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(new HomePage(page).profileAvatarButton).toBeVisible();
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(true);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });
});

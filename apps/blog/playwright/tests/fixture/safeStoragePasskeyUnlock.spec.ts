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
 * authenticator (CDP WebAuthn, with PRF), which stands for a provider that syncs: enabling looks
 * for the account's passkey first and creates one only where none is picked; it then unlocks the
 * next sign-in after a sign-out without the password and without creating another passkey. A
 * failed creation shows the retry message, dismisses nothing and can be retried at once. A device
 * without a record (a second device) keeps the passkey it finds. A record pointing at a credential
 * the provider replaced moves to the account's passkey after one password, with no offer. A passkey
 * gone from the provider shows one line and drops the record; a record the passkey no longer
 * decrypts is removed, and the offer returns after the password. The ceremonies themselves are
 * covered by packages/smart-signer/lib/passkey-unlock/passkey-unlock-ceremony.test.ts.
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

type RecordChange = 'read' | 'corrupt' | 'as-hb-auth' | 'repoint' | 'delete';

/**
 * Whether hb-auth's passkey record store, the `/passkeys_v3` IndexedDB the app writes, holds
 * `username`'s record, after `change`: spoiling its password, dropping `transports`, which
 * hb-auth's records lack, pointing it at a credential the provider does not hold (as one another
 * device's creation replaced), or deleting it (as on a device the unlock was not enabled on)
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
            if (change === 'repoint' && record) {
              record.credentialId = record.credentialId.map((byte: number) => byte ^ 0xff);
              store.put(record);
            }
            if (change === 'delete' && record) store.delete(username);
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

async function changePasskeyRecord(page: Page, change: RecordChange, username: string): Promise<void> {
  expect(await withPasskeyStore<boolean>(page, change, username)).toBe(true);
}

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

/**
 * Enables the unlock from the offer on an authenticator without the account's passkey: the
 * discovery finds none, and the next step creates it
 */
async function enableByCreating(loginForm: LoginForm, prompt: ReturnType<Page['getByTestId']>): Promise<void> {
  await prompt.getByTestId('passkey-prompt-enable').click();
  await expect(prompt).toHaveAttribute('data-step', 'create', { timeout: SIGN_IN_TIMEOUT_MS });
  await prompt.getByTestId('passkey-prompt-create').click();
  await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
}

/** Signs out and in again, which the passkey alone unlocks */
async function signInWithPasskeyAlone(page: Page, loginForm: LoginForm): Promise<void> {
  await signOut(page);
  await openSignIn(page);
  await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
  await expect(new HomePage(page).profileAvatarButton).toBeVisible();
}

type PasskeySignal = { name: 'unknown' | 'all-accepted'; options: { credentialId?: string; allAcceptedCredentialIds?: string[] } };

/**
 * Replaces WebAuthn's signal methods, which Google Password Manager acts on by hiding or removing a
 * synced passkey, with spies recording what the app sends
 */
async function spyOnPasskeySignals(page: Page): Promise<() => Promise<PasskeySignal[]>> {
  await page.evaluate(() => {
    const sent: unknown[] = [];
    Object.assign(window, { passkeySignals: sent });
    const record = (name: string) => async (options: unknown) => {
      sent.push({ name, options });
    };
    Object.defineProperty(PublicKeyCredential, 'signalUnknownCredential', { value: record('unknown'), configurable: true });
    Object.defineProperty(PublicKeyCredential, 'signalAllAcceptedCredentials', {
      value: record('all-accepted'),
      configurable: true
    });
  });
  return () => page.evaluate(() => Reflect.get(window, 'passkeySignals'));
}

/** Answers every passkey prompt as the browser does the user's cancel: NotAllowedError */
async function cancelPasskeyPrompts(page: Page): Promise<void> {
  await page.evaluate(() => {
    navigator.credentials.get = async () => {
      throw new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError');
    };
  });
}

/** CDP's credential ID (base64) as the app's signals name it (base64url) */
const asBase64url = (credentialId: string) => credentialId.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const dismissalOf = (page: Page, username: string) =>
  page.evaluate((key) => window.localStorage.getItem(key), `passkey-dismissed-${username}`);

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
    const signals = await spyOnPasskeySignals(page);

    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    const { credentials } = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
    expect(credentials).toHaveLength(1);
    const sent = await signals();
    expect(sent.map(({ name }) => name)).toEqual(['all-accepted']);
    expect(sent[0].options.allAcceptedCredentialIds).toEqual([asBase64url(credentials[0].credentialId)]);

    await signInWithPasskeyAlone(page, loginForm);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-02 — a failed passkey creation shows the retry message, dismisses nothing, and is retried at once', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    // The user verification the creation needs fails, as a provider's unfinished setup: NotAllowedError
    await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false });

    const { loginForm, prompt } = await signInWithPassword(page);
    await prompt.getByTestId('passkey-prompt-enable').click();
    await expect(prompt).toHaveAttribute('data-step', 'create', { timeout: SIGN_IN_TIMEOUT_MS });
    await prompt.getByTestId('passkey-prompt-create').click();
    await expect(prompt.getByTestId('passkey-prompt-error')).toHaveText("Couldn't enable biometric unlock. Try again.", {
      timeout: SIGN_IN_TIMEOUT_MS
    });
    await expect(page.getByText(/not allowed|webauthn|Passkey creation/i)).toHaveCount(0);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(0);
    expect(await dismissalOf(page, ACCOUNT)).toBeNull();

    // The provider's setup is done: the device's authenticator now verifies the user
    await cdp.send('WebAuthn.removeVirtualAuthenticator', { authenticatorId });
    const retried = await addPlatformAuthenticator(page);
    await prompt.getByTestId('passkey-prompt-create').click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await passkeyCount(retried.cdp, retried.authenticatorId)).toBe(1);
    expect(await dismissalOf(page, ACCOUNT)).toBeNull();
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-03 — a passkey gone from the provider is said once, its record dropped, and the offer returns', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    // The passkey is gone from the provider: the browser answers NotAllowedError, as for a cancel
    await cdp.send('WebAuthn.clearCredentials', { authenticatorId });

    await signOut(page);
    const next = await openSignIn(page);
    await expect(next.loginDialog.getByText('The saved passkey is no longer available on this device; sign in with your password.')).toBeVisible({
      timeout: SIGN_IN_TIMEOUT_MS
    });
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(false);
    await next.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await next.signInButton.click();
    const offer = next.loginDialog.getByTestId('passkey-prompt');
    await expect(offer).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await enableByCreating(next, offer);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);

    await signInWithPasskeyAlone(page, next);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-04 — a record that no longer decrypts is cleared, and enabling again leaves one passkey', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
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
    await enableByCreating(loginForm, prompt);
    await writeAsHbAuth(page, ACCOUNT);

    await signOut(page);
    await openSignIn(page);
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(new HomePage(page).profileAvatarButton).toBeVisible();
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(true);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-06 — a device without a record keeps the account\'s passkey it finds, creating none', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    const [created] = (await cdp.send('WebAuthn.getCredentials', { authenticatorId })).credentials;
    // A second device: the provider syncs the passkey there, but its own store has no record
    await changePasskeyRecord(page, 'delete', ACCOUNT);

    await signOut(page);
    const signals = await spyOnPasskeySignals(page);
    const { loginForm: next, prompt: offer } = await signInWithPassword(page);
    await offer.getByTestId('passkey-prompt-enable').click();
    await expect(next.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await signals()).toEqual([]);
    const { credentials } = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
    expect(credentials.map(({ credentialId }) => credentialId)).toEqual([created.credentialId]);

    await signInWithPasskeyAlone(page, next);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-07 — a record of a replaced credential moves to the account\'s passkey after one password, with no offer', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    await changePasskeyRecord(page, 'repoint', ACCOUNT);

    await signOut(page);
    const signals = await spyOnPasskeySignals(page);
    const next = await openSignIn(page);
    await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    await next.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await next.signInButton.click();
    await expect(next.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await signals()).toEqual([]);

    await signInWithPasskeyAlone(page, next);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-08 — cancelling both passkey prompts drops only the record: no signal, the passkey stays', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    const [created] = (await cdp.send('WebAuthn.getCredentials', { authenticatorId })).credentials;

    await signOut(page);
    const signals = await spyOnPasskeySignals(page);
    await cancelPasskeyPrompts(page);
    const next = await openSignIn(page);
    await expect(next.loginDialog.getByText('The saved passkey is no longer available on this device; sign in with your password.')).toBeVisible({
      timeout: SIGN_IN_TIMEOUT_MS
    });
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(false);
    expect(await signals()).toEqual([]);
    const { credentials } = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
    expect(credentials.map(({ credentialId }) => credentialId)).toEqual([created.credentialId]);
  });
});

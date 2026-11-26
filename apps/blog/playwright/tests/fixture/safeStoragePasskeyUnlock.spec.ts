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
  OTHER_ACCOUNT,
  SIGN_IN_TIMEOUT_MS,
  storeAccount
} from '../support/safeStorageContext';

/**
 * The biometric unlock of safe storage with a platform passkey, here Chromium's virtual
 * authenticator (CDP WebAuthn, with PRF), which stands for a provider that syncs: enabling looks
 * for the account's passkey first and creates one only where none is picked; it then unlocks the
 * next sign-in after a sign-out without the password and without creating another passkey. A
 * failed creation shows the retry message, dismisses nothing and can be retried at once. A device
 * without a record (a second device) keeps the passkey it finds. A cancelled creation is no error, a
 * failed one is. The sign-in asks in one request
 * naming no credential; a record pointing at a credential the provider replaced moves to the
 * account's passkey after one password, which the form says, with no offer. A cancelled prompt, or a
 * passkey the browser no longer reaches, leaves the password form and keeps the record; a record the
 * passkey no longer decrypts is removed, and the offer returns after the password. Another account's
 * passkey picked at enabling offers this account's first. The account menu turns the unlock off on
 * this device, which the next password sign-in offers again, and on, reusing the account's passkey.
 * After two sign-ins in a row whose picked passkey then failed, the password form offers to turn the
 * unlock off or set it up again; cancels, which the browser answers as it does a passkey it no
 * longer reaches, count against no account. Closing the form after changing its account asks no
 * passkey. Coming back to the form from "Add new key" asks no passkey again. A record
 * on a salt of its own, as the build before the device salt wrote it, unlocks with the same one
 * request and moves to the device salt. The ceremonies, and switching between two linked accounts, are covered by
 * packages/smart-signer/lib/passkey-unlock/passkey-unlock-ceremony.test.ts and passkey-unlock.test.ts.
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

/** The PRF salt `username`'s record is encrypted under, and the device salt it is to be on */
function passkeySalts(page: Page, username: string): Promise<{ record: number[]; device: number[] }> {
  return page.evaluate(async (username) => {
    const read = (name: string, store: string, key: string) =>
      new Promise<Uint8Array>((resolve, reject) => {
        const open = indexedDB.open(name, 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const request = open.result.transaction(store, 'readonly').objectStore(store).get(key);
          request.onsuccess = () => {
            open.result.close();
            resolve(store === 'credentials' ? request.result.prfSalt : request.result);
          };
          request.onerror = () => reject(request.error);
        };
      });
    return {
      record: Array.from(await read('/passkeys_v3', 'credentials', username)),
      device: Array.from(await read('/passkeys_v3_device', 'device', 'prfSalt'))
    };
  }, username);
}

/**
 * Encrypts `username`'s record again under a salt of its own, as the build before the device salt
 * wrote it, asking the record's passkey for the salt's PRF output
 */
async function moveToOwnSalt(page: Page, username: string, password: string): Promise<void> {
  await page.evaluate(
    async ([username, password]) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const open = indexedDB.open('/passkeys_v3', 1);
        open.onsuccess = () => resolve(open.result);
        open.onerror = () => reject(open.error);
      });
      const stored = await new Promise<Record<string, Uint8Array<ArrayBuffer>>>((resolve, reject) => {
        const request = db.transaction('credentials', 'readonly').objectStore('credentials').get(username);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const prfSalt = crypto.getRandomValues(new Uint8Array(32));
      const credential = (await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rpId: location.hostname,
          allowCredentials: [{ id: stored.credentialId, type: 'public-key' }],
          userVerification: 'required',
          extensions: { prf: { eval: { first: prfSalt } } }
        }
      })) as PublicKeyCredential;
      const output = credential.getClientExtensionResults().prf?.results?.first;
      if (!output) throw new Error('the passkey gave no PRF output');
      const key = await crypto.subtle.importKey('raw', output, 'AES-GCM', false, ['encrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(password));
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction('credentials', 'readwrite');
        transaction.objectStore('credentials').put({ ...stored, prfSalt, iv, encryptedPassword: new Uint8Array(encrypted) });
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      db.close();
    },
    [username, password] as const
  );
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

type PasskeyRequests = {
  /**
   * The number of credentials each passkey request named, but those the app aborted (`next dev`'s
   * strict mode mounts the sign-in twice, and the first mount's prompt is aborted)
   */
  named: () => Promise<number[]>;
  /** Answers the requests from now on as the browser does the user's cancel (NotAllowedError), or as the authenticator does */
  cancel: (cancelling: boolean) => Promise<void>;
};

/** Records every passkey request the app makes, which the browser answers until `cancel(true)` */
async function spyOnPasskeyRequests(page: Page): Promise<PasskeyRequests> {
  await page.evaluate(() => {
    const requests: { named: number; signal?: AbortSignal | null }[] = [];
    const get = navigator.credentials.get.bind(navigator.credentials);
    Object.assign(window, { passkeyRequests: requests, passkeyCancelling: false });
    navigator.credentials.get = async (options?: CredentialRequestOptions) => {
      requests.push({ named: options?.publicKey?.allowCredentials?.length ?? 0, signal: options?.signal });
      if (Reflect.get(window, 'passkeyCancelling')) {
        throw new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError');
      }
      return get(options);
    };
  });
  return {
    named: () =>
      page.evaluate(() =>
        (Reflect.get(window, 'passkeyRequests') as { named: number; signal?: AbortSignal | null }[])
          .filter(({ signal }) => !signal?.aborted)
          .map(({ named }) => named)
      ),
    cancel: async (cancelling) => {
      await page.evaluate((value) => {
        Object.assign(window, { passkeyCancelling: value });
      }, cancelling);
    }
  };
}

/** Answers every passkey request with a passkey of another account, which carries another user handle */
async function pickAnotherAccountsPasskey(page: Page): Promise<void> {
  await page.evaluate(() => {
    navigator.credentials.get = async () =>
      ({
        rawId: new Uint8Array([4, 2]).buffer,
        response: { userHandle: new Uint8Array(16).fill(7).buffer },
        getClientExtensionResults: () => ({ prf: { results: { first: new Uint8Array(32).buffer } } })
      }) as unknown as Credential;
  });
}

/**
 * Answers the request naming no credential with the passkey the user picks, but without the PRF
 * output of the record's own salt, and fails every request naming a credential as an authenticator
 * error does: a record on a salt of its own then fails after its passkey was picked
 */
async function failPickedPasskeyRequests(page: Page): Promise<void> {
  await page.evaluate(() => {
    const get = navigator.credentials.get.bind(navigator.credentials);
    navigator.credentials.get = async (options?: CredentialRequestOptions) => {
      if (options?.publicKey?.allowCredentials?.length) throw new DOMException('The authenticator failed.', 'UnknownError');
      const credential = (await get(options)) as PublicKeyCredential;
      const first = credential.getClientExtensionResults().prf?.results?.first;
      return {
        rawId: credential.rawId,
        response: credential.response,
        getClientExtensionResults: () => ({ prf: { results: { first } } })
      } as unknown as Credential;
    };
  });
}

/** The passkey failure counts the app keeps, by their localStorage key */
const passkeyFailureCounts = (page: Page) =>
  page.evaluate(() =>
    Object.keys(window.localStorage).filter((key) => key.startsWith('passkey-unlock-failures-'))
  );

/** Long enough for a passkey request a closed form started to reach the browser */
const CLOSED_FORM_SETTLE_MS = 1_500;

/** Fails the next passkey creation as an authenticator error does, not as a cancel (NotAllowedError) */
async function failNextPasskeyCreation(page: Page): Promise<void> {
  await page.evaluate(() => {
    const create = navigator.credentials.create.bind(navigator.credentials);
    let failed = false;
    navigator.credentials.create = async (options?: CredentialCreationOptions) => {
      if (failed) return create(options);
      failed = true;
      throw new DOMException('The authenticator failed.', 'UnknownError');
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

  test('BLOG-SAFE-STORAGE-PASSKEY-02 — a cancelled passkey creation shows no error, dismisses nothing, and is retried at once', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    // The user verification the creation needs fails, as a provider's unfinished setup: NotAllowedError
    await cdp.send('WebAuthn.setUserVerified', { authenticatorId, isUserVerified: false });

    const { loginForm, prompt } = await signInWithPassword(page);
    await prompt.getByTestId('passkey-prompt-enable').click();
    await expect(prompt).toHaveAttribute('data-step', 'create', { timeout: SIGN_IN_TIMEOUT_MS });
    await prompt.getByTestId('passkey-prompt-create').click();
    await expect(prompt.getByTestId('passkey-prompt-notice')).toHaveText('No passkey was created. You can try again.', {
      timeout: SIGN_IN_TIMEOUT_MS
    });
    await expect(prompt.getByTestId('passkey-prompt-error')).toHaveCount(0);
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

  test('BLOG-SAFE-STORAGE-PASSKEY-03 — a passkey the browser no longer reaches leaves the password form and keeps the record', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    // The browser answers a passkey it no longer reaches with NotAllowedError, as it does a cancel: no evidence it is gone
    await cdp.send('WebAuthn.clearCredentials', { authenticatorId });

    await signOut(page);
    const requests = await spyOnPasskeyRequests(page);
    const next = await openSignIn(page);
    await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(next.loginDialog.getByTestId('safe-storage-error')).toHaveCount(0);
    expect(await requests.named()).toEqual([0]);
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(true);
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
    const requests = await spyOnPasskeyRequests(page);
    const next = await openSignIn(page);
    await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    // One request naming no credential: the replaced one is never named, so no "no passkeys" dialog
    expect(await requests.named()).toEqual([0]);
    await expect(next.loginDialog.getByTestId('passkey-relink-hint')).toHaveText(
      'Enter your password once to link this device to your existing passkey.'
    );
    await next.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await next.signInButton.click();
    await expect(next.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await signals()).toEqual([]);

    await signInWithPasskeyAlone(page, next);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-08 — a cancelled passkey prompt leaves the password form, asks nothing more and keeps the record', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    const [created] = (await cdp.send('WebAuthn.getCredentials', { authenticatorId })).credentials;

    await signOut(page);
    const signals = await spyOnPasskeySignals(page);
    const requests = await spyOnPasskeyRequests(page);
    await requests.cancel(true);
    const next = await openSignIn(page);
    await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(next.loginDialog.getByTestId('safe-storage-error')).toHaveCount(0);
    expect(await requests.named()).toEqual([0]);
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(true);
    expect(await signals()).toEqual([]);
    const { credentials } = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
    expect(credentials.map(({ credentialId }) => credentialId)).toEqual([created.credentialId]);

    // The password signs in, offering nothing; the next sign-in unlocks with the passkey alone
    await next.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await next.signInButton.click();
    await expect(next.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    await requests.cancel(false);
    await signInWithPasskeyAlone(page, next);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-09 — the account menu turns the unlock off on this device, and the next password sign-in offers it again', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);

    const homePage = new HomePage(page);
    const profileMenu = new ProfileUserMenu(page);
    await clickUntilOpen(homePage.profileAvatarButton, profileMenu.profileMenuContent);
    await page.getByTestId('passkey-unlock-turn-off-menu-item').click();
    const dialog = page.getByTestId('turn-off-passkey-unlock-dialog');
    await expect(dialog).toContainText('The passkey itself stays in your password manager');
    await dialog.getByTestId('turn-off-passkey-unlock-confirm').click();
    await expect(dialog).toHaveCount(0);
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(false);
    // The passkey stays with its provider: the app cannot remove it there
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);

    expect(await dismissalOf(page, ACCOUNT)).toBeNull();
    await clickUntilOpen(homePage.profileAvatarButton, profileMenu.profileMenuContent);
    await expect(page.getByTestId('passkey-unlock-turn-on-menu-item')).toHaveText('Turn on biometric unlock');
    await expect(page.getByTestId('passkey-unlock-turn-off-menu-item')).toHaveCount(0);
    await page.keyboard.press('Escape');

    await signOut(page);
    const requests = await spyOnPasskeyRequests(page);
    const next = await openSignIn(page);
    await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await requests.named()).toEqual([]);
    await next.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await next.signInButton.click();
    // The offer is back, and enabling keeps the passkey the password manager still holds
    const offer = next.loginDialog.getByTestId('passkey-prompt');
    await expect(offer).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await offer.getByTestId('passkey-prompt-enable').click();
    await expect(next.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(true);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-10 — another account\'s passkey picked at enabling says so and offers this account\'s first', async ({
    page
  }) => {
    await addPlatformAuthenticator(page);
    await pickAnotherAccountsPasskey(page);
    const { prompt } = await signInWithPassword(page);
    await prompt.getByTestId('passkey-prompt-enable').click();
    await expect(prompt).toHaveAttribute('data-step', 'wrong-account', { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(prompt.getByTestId('passkey-prompt-title')).toHaveText('That passkey belongs to another account');
    const buttons = prompt.getByRole('button');
    await expect(buttons.nth(0)).toHaveAttribute('data-testid', 'passkey-prompt-reuse');
    await expect(buttons.nth(1)).toHaveAttribute('data-testid', 'passkey-prompt-create');
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(false);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-11 — a passkey creation failing otherwise than by a cancel shows the error and is retried at once', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    await failNextPasskeyCreation(page);

    const { loginForm, prompt } = await signInWithPassword(page);
    await prompt.getByTestId('passkey-prompt-enable').click();
    await expect(prompt).toHaveAttribute('data-step', 'create', { timeout: SIGN_IN_TIMEOUT_MS });
    await prompt.getByTestId('passkey-prompt-create').click();
    await expect(prompt.getByTestId('passkey-prompt-error')).toHaveText("Couldn't enable biometric unlock. Try again.", {
      timeout: SIGN_IN_TIMEOUT_MS
    });
    await expect(prompt.getByTestId('passkey-prompt-notice')).toHaveCount(0);

    await prompt.getByTestId('passkey-prompt-create').click();
    await expect(loginForm.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-12 — turned off, the account menu turns the unlock on after the password, reusing the account\'s passkey', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    const signals = await spyOnPasskeySignals(page);

    const homePage = new HomePage(page);
    const profileMenu = new ProfileUserMenu(page);
    await clickUntilOpen(homePage.profileAvatarButton, profileMenu.profileMenuContent);
    await page.getByTestId('passkey-unlock-turn-off-menu-item').click();
    await page.getByTestId('turn-off-passkey-unlock-confirm').click();
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(false);

    await clickUntilOpen(homePage.profileAvatarButton, profileMenu.profileMenuContent);
    await page.getByTestId('passkey-unlock-turn-on-menu-item').click();
    await expect(loginForm.enterYourPasswordForm).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await loginForm.passwordToUnlockKeyInput.fill('not the password');
    await loginForm.passwordToUnlockKeySubmitButton.click();
    await expect(page.getByTestId('password-form-error-message')).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await loginForm.passwordToUnlockKeyInput.fill(SAFE_STORAGE_PASSWORD);
    await loginForm.passwordToUnlockKeySubmitButton.click();

    // Choosing "Turn on" in the menu was the decision: the passkey is asked for with no second question
    const dialog = page.getByTestId('turn-on-passkey-unlock-dialog');
    await expect(dialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(page.getByTestId('passkey-prompt-enable')).toHaveCount(0);
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(true);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
    // Only this device's own create() is signalled
    expect(await signals()).toEqual([]);

    await signInWithPasskeyAlone(page, loginForm);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-13 — after two sign-ins the picked passkey failed, the password form offers to turn it off or set it up again', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    await moveToOwnSalt(page, ACCOUNT, SAFE_STORAGE_PASSWORD);
    await failPickedPasskeyRequests(page);
    const signals = await spyOnPasskeySignals(page);

    await signOut(page);
    const first = await openSignIn(page);
    await expect(first.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    await expect(first.loginDialog.getByTestId('passkey-unlock-failing-notice')).toHaveCount(0);
    await first.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await first.signInButton.click();
    await expect(first.loginDialog).toHaveCount(0, { timeout: SIGN_IN_TIMEOUT_MS });

    // Each sign-in is a new form: the count is kept with the account, not in the form
    await signOut(page);
    const second = await openSignIn(page);
    const notice = second.loginDialog.getByTestId('passkey-unlock-failing-notice');
    await expect(notice).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(true);

    // Deleted in the password manager meanwhile: setting up again creates the account's passkey
    await cdp.send('WebAuthn.clearCredentials', { authenticatorId });
    await notice.getByTestId('passkey-unlock-failing-set-up').click();
    await expect(notice).toHaveAttribute('data-state', 'set-up-again');
    await second.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await second.signInButton.click();
    const offer = second.loginDialog.getByTestId('passkey-prompt');
    await enableByCreating(second, offer);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
    expect((await signals()).map(({ name }) => name)).toEqual(['all-accepted']);

    await signInWithPasskeyAlone(page, second);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-14 — the notice\'s turn off removes the record and signals nothing', async ({ page }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    await moveToOwnSalt(page, ACCOUNT, SAFE_STORAGE_PASSWORD);
    await signOut(page);
    await failPickedPasskeyRequests(page);
    const signals = await spyOnPasskeySignals(page);
    const requests = await spyOnPasskeyRequests(page);

    for (const attempt of [1, 2]) {
      const next = await openSignIn(page);
      await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
      if (attempt === 1) {
        await expect(next.loginDialog.getByTestId('passkey-unlock-failing-notice')).toHaveCount(0);
        await next.closeDialog.click();
        await expect(next.loginDialog).toHaveCount(0);
      }
    }
    // Each opening of the sign-in asks the passkey once, then the record's own credential
    expect(await requests.named()).toEqual([0, 1, 0, 1]);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
    const notice = loginForm.loginDialog.getByTestId('passkey-unlock-failing-notice');
    await expect(notice).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    // With the account field it is about, under it, not over the form
    await expect(loginForm.loginFormDescription.locator('..').getByTestId('passkey-unlock-failing-notice')).toHaveCount(0);
    const field = await loginForm.usernameInput.boundingBox();
    const placed = await notice.boundingBox();
    expect(field && placed && placed.y >= field.y + field.height).toBe(true);
    await notice.getByTestId('passkey-unlock-failing-turn-off').click();
    await expect(notice).toHaveAttribute('data-state', 'turned-off');
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(false);
    expect(await signals()).toEqual([]);

    // The offer after the password replaces the form, and its "turned off" with it
    await loginForm.passwordInput.fill(SAFE_STORAGE_PASSWORD);
    await loginForm.signInButton.click();
    await expect(loginForm.loginDialog.getByTestId('passkey-prompt')).toBeVisible({ timeout: SIGN_IN_TIMEOUT_MS });
    await expect(notice).toHaveCount(0);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-16 — a record on a salt of its own unlocks with one request and moves to the device salt', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    const created = await passkeySalts(page, ACCOUNT);
    expect(created.record).toEqual(created.device);
    await moveToOwnSalt(page, ACCOUNT, SAFE_STORAGE_PASSWORD);
    const own = await passkeySalts(page, ACCOUNT);
    expect(own.record).not.toEqual(own.device);

    const signals = await spyOnPasskeySignals(page);
    const requests = await spyOnPasskeyRequests(page);
    await signInWithPasskeyAlone(page, loginForm);
    expect(await requests.named()).toEqual([0]);
    const moved = await passkeySalts(page, ACCOUNT);
    expect(moved.record).toEqual(own.device);
    expect(moved.device).toEqual(own.device);

    await signInWithPasskeyAlone(page, loginForm);
    expect(await requests.named()).toEqual([0, 0]);
    expect(await signals()).toEqual([]);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-15 — coming back to the form from "Add new key" asks no passkey again', async ({ page }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);

    await signOut(page);
    const requests = await spyOnPasskeyRequests(page);
    await requests.cancel(true);
    const next = await openSignIn(page);
    await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await requests.named()).toEqual([0]);

    await next.loginDialog.getByTestId('safe-storage-key-update-link').click();
    await next.loginDialog.getByTestId('login-form-back').click();
    await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    expect(await requests.named()).toEqual([0]);
    expect(await passkeyCount(cdp, authenticatorId)).toBe(1);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-17 — cancels of a working passkey, or a passkey the browser no longer reaches, count against no account', async ({
    page
  }) => {
    const { cdp, authenticatorId } = await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    await signOut(page);
    const signals = await spyOnPasskeySignals(page);
    const requests = await spyOnPasskeyRequests(page);
    await requests.cancel(true);

    for (const _attempt of [1, 2, 3]) {
      const next = await openSignIn(page);
      await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
      await expect(next.loginDialog.getByTestId('passkey-unlock-failing-notice')).toHaveCount(0);
      await next.closeDialog.click();
      await expect(next.loginDialog).toHaveCount(0);
    }
    expect(await requests.named()).toEqual([0, 0, 0]);
    expect(await passkeyFailureCounts(page)).toEqual([]);

    // Deleted in the password manager: the browser answers as it does a cancel, which says nothing of the passkey
    await requests.cancel(false);
    await cdp.send('WebAuthn.clearCredentials', { authenticatorId });
    for (const _attempt of [1, 2]) {
      const next = await openSignIn(page);
      await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
      await expect(next.loginDialog.getByTestId('passkey-unlock-failing-notice')).toHaveCount(0);
      await next.closeDialog.click();
      await expect(next.loginDialog).toHaveCount(0);
    }
    expect(await passkeyFailureCounts(page)).toEqual([]);
    expect(await hasPasskeyRecord(page, ACCOUNT)).toBe(true);
    expect(await signals()).toEqual([]);
  });

  test('BLOG-SAFE-STORAGE-PASSKEY-18 — closing the form after the user changed its account asks no passkey', async ({ page }) => {
    await addPlatformAuthenticator(page);
    const { loginForm, prompt } = await signInWithPassword(page);
    await enableByCreating(loginForm, prompt);
    await signOut(page);
    const requests = await spyOnPasskeyRequests(page);
    await requests.cancel(true);

    const next = await openSignIn(page);
    await expect(next.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    await next.usernameInput.fill(OTHER_ACCOUNT);
    await expect(next.usernameInput).toHaveValue(OTHER_ACCOUNT);
    await next.closeDialog.click();
    await expect(next.loginDialog).toHaveCount(0);
    await page.waitForTimeout(CLOSED_FORM_SETTLE_MS);
    expect(await requests.named()).toEqual([0]);

    // Changing back to the linked account in an open form still asks its passkey
    const again = await openSignIn(page);
    await expect(again.loginFormDescription).toHaveText('Unlock user with password', { timeout: SIGN_IN_TIMEOUT_MS });
    await again.usernameInput.fill(OTHER_ACCOUNT);
    await expect(again.usernameInput).toHaveValue(OTHER_ACCOUNT);
    await again.usernameInput.fill(ACCOUNT);
    await expect.poll(() => requests.named(), { timeout: SIGN_IN_TIMEOUT_MS }).toEqual([0, 0, 0]);
    expect(await passkeyFailureCounts(page)).toEqual([]);
  });
});

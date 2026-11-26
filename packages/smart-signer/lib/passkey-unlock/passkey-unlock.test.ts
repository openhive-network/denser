import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/passkey-unlock/passkey-unlock-ceremony': new URL('./passkey-unlock-ceremony.ts', import.meta.url).href,
  '@smart-signer/lib/passkey-unlock/passkey-unlock-error': new URL('./passkey-unlock-error.ts', import.meta.url).href,
  '@smart-signer/lib/passkey-unlock/passkey-unlock-store': new URL('./passkey-unlock-store.ts', import.meta.url).href,
  '@smart-signer/lib/passkey-unlock/passkey-signals': new URL('./passkey-signals.ts', import.meta.url).href,
  '@ui/lib/logging': `data:text/javascript,${encodeURIComponent('export const getLogger = () => ({ info() {}, error() {} });')}`,
  '@smart-signer/lib/wrong-safe-storage-password': new URL('../wrong-safe-storage-password.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { createPasskeyUnlock } = await import('./passkey-unlock-ceremony.ts');
const { PasskeyUnlockError } = await import('./passkey-unlock-error.ts');
const {
  adoptReplacedPasskey,
  PasskeyReplacedError,
  registerPasskeyUnlock,
  reusePasskeyUnlockOf,
  unlockWithPasskey,
  unlockWithPasskeyGivingPassword
} = await import('./passkey-unlock.ts');
type PasskeyUnlockRecord = Awaited<ReturnType<typeof createPasskeyUnlock>>;

const USERNAME = 'guest4test2';
const PASSWORD = 'safe storage password';
const RP_ID = 'wallet.example';
const DEVICE_SALT = new Uint8Array(32).fill(1);
/** The salt of its own a record written before the device salt holds */
const OWN_SALT = new Uint8Array(32).fill(3);

type Passkey = { id: Uint8Array<ArrayBuffer>; userHandle: ArrayBuffer; secret: string };

const notAllowed = () => new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError');
const sameId = (a: BufferSource, b: Uint8Array) => a instanceof Uint8Array && a.length === b.length && a.every((x, i) => x === b[i]);

/**
 * A syncing passkey provider whose PRF output is a digest of a passkey's secret and the salt: the
 * user picks its first passkey where a request names none, and `getError` rejects every prompt
 */
function authenticator(secret: string, getError?: Error) {
  const passkeys: Passkey[] = [];
  const got: CredentialRequestOptions[] = [];
  let created = 0;
  const prf = (passkey: Passkey, salt: unknown) => {
    assert.ok(salt instanceof Uint8Array);
    return crypto.subtle.digest('SHA-256', new Uint8Array([...new TextEncoder().encode(passkey.secret), ...salt]));
  };
  return {
    passkeys,
    got,
    created: () => created,
    /** Another device created the account's passkey again: the provider replaced the one it held */
    replace(secretOfNew: string) {
      const [old] = passkeys.splice(0);
      passkeys.push({ id: new Uint8Array([9, 9, 9]), userHandle: old.userHandle, secret: secretOfNew });
    },
    async create(options?: CredentialCreationOptions) {
      created += 1;
      const userHandle = options?.publicKey?.user.id;
      assert.ok(userHandle instanceof Uint8Array);
      const passkey = { id: new Uint8Array([1, 2, 3]), userHandle: userHandle.buffer, secret };
      passkeys.splice(0, passkeys.length, passkey);
      const first = await prf(passkey, options?.publicKey?.extensions?.prf?.eval?.first);
      return {
        rawId: passkey.id.buffer,
        response: {},
        getClientExtensionResults: () => ({ prf: { enabled: true, results: { first } } })
      } as unknown as Credential;
    },
    async get(options?: CredentialRequestOptions) {
      if (options) got.push(options);
      if (getError) throw getError;
      const allowed = options?.publicKey?.allowCredentials;
      const passkey = allowed?.length ? passkeys.find(({ id }) => allowed.some((a) => sameId(a.id, id))) : passkeys[0];
      if (!passkey) throw notAllowed();
      const { first, second } = options?.publicKey?.extensions?.prf?.eval ?? {};
      const results = { first: await prf(passkey, first), ...(second ? { second: await prf(passkey, second) } : {}) };
      return {
        rawId: passkey.id.buffer,
        response: { userHandle: passkey.userHandle },
        getClientExtensionResults: () => ({ prf: { results } })
      } as unknown as Credential;
    }
  };
}

/** The passkey record store, in memory, on DEVICE_SALT */
function memoryStore(...stored: PasskeyUnlockRecord[]) {
  const records = new Map(stored.map((record) => [record.username, record]));
  return {
    records,
    deviceSalt: async () => DEVICE_SALT,
    read: async (username: string) => records.get(username) ?? null,
    remove: async (username: string) => {
      records.delete(username);
    },
    write: async (written: PasskeyUnlockRecord) => {
      records.set(written.username, written);
    }
  };
}

/** hb-auth's refusal as its worker hands it over: Comlink's plain Error carrying the class's name */
const invalidCredentials = () => Object.assign(new Error('Invalid credentials'), { name: 'AuthorizationError' });

/** hb-auth's client, refusing every password but `accepted`; `stored` is whether it holds the user */
function hbAuthClient(accepted: string, stored = true) {
  const passwords: string[] = [];
  return {
    passwords,
    async authenticate(_username: string, password: string, _keyType: 'posting') {
      passwords.push(password);
      if (password !== accepted) throw invalidCredentials();
      return { ok: true };
    },
    getRegisteredUserByUsername: async (username: string) => (stored ? { username } : null)
  };
}

async function registered(provider = authenticator('passkey')) {
  return memoryStore(await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, DEVICE_SALT));
}

const cancel = () => new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError');

describe('unlockWithPasskey', () => {
  it('authenticates with the password the passkey gives, and keeps its record', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);
    const client = hbAuthClient(PASSWORD);

    const status = await unlockWithPasskey(client, USERNAME, 'posting', 'required', provider, store);

    assert.deepEqual(status, { ok: true });
    assert.deepEqual(client.passwords, [PASSWORD]);
    assert.equal(store.records.size, 1);
  });

  it('removes a record whose password the passkey does not decrypt, so the offer returns', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);
    provider.passkeys[0].secret = 'another';
    const client = hbAuthClient(PASSWORD);

    const error = await unlockWithPasskey(client, USERNAME, 'posting', 'required', provider, store).catch(
      (e: unknown) => e
    );

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'stale');
    assert.deepEqual(client.passwords, []);
    assert.equal(store.records.size, 0);
  });

  it('removes a record whose password safe storage refuses', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);

    const error = await unlockWithPasskey(
      hbAuthClient('the password changed since'),
      USERNAME,
      'posting',
      'required',
      provider,
      store
    ).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'stale');
    assert.equal(store.records.size, 0);
  });

  it('asks once, naming no credential, so a replaced one never shows the browser\'s "no passkeys" dialog', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);

    await unlockWithPasskey(hbAuthClient(PASSWORD), USERNAME, 'posting', 'discouraged', provider, store);

    assert.equal(provider.got.length, 1);
    assert.deepEqual(provider.got[0].publicKey?.allowCredentials, []);
    assert.equal(provider.got[0].publicKey?.userVerification, 'discouraged');
  });

  it('keeps the record, asking nothing more, when the user cancels the prompt', async () => {
    const provider = authenticator('passkey', cancel());
    const store = await registered(authenticator('passkey'));
    const client = hbAuthClient(PASSWORD);

    const error = await unlockWithPasskey(client, USERNAME, 'posting', 'required', provider, store).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
    assert.equal(error.account, undefined);
    assert.equal(provider.got.length, 1);
    assert.deepEqual(client.passwords, []);
    assert.equal(store.records.size, 1);
  });

  it('keeps the record where the account has no passkey the browser reaches: that answers as a cancel does', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);
    provider.passkeys.length = 0;

    const error = await unlockWithPasskey(hbAuthClient(PASSWORD), USERNAME, 'posting', 'required', provider, store).catch(
      (e: unknown) => e
    );

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
    assert.equal(provider.got.length, 1);
    assert.equal(store.records.size, 1);
  });

  it('hands the browser the abort signal, and keeps the record of a prompt it aborted', async () => {
    const store = await registered();
    const controller = new AbortController();
    const requests: CredentialRequestOptions[] = [];
    const aborting = {
      create: authenticator('passkey').create,
      get: async (options?: CredentialRequestOptions) => {
        if (options) requests.push(options);
        controller.abort();
        throw new DOMException('The request was aborted', 'AbortError');
      }
    };

    const error = await unlockWithPasskeyGivingPassword(hbAuthClient(PASSWORD), USERNAME, 'posting', 'required', {
      credentials: aborting,
      store,
      signal: controller.signal
    }).catch((e: unknown) => e);

    assert.equal(requests[0].signal, controller.signal);
    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
    assert.equal(store.records.size, 1);
  });

  it("rejects as wrong-account, keeping the record, a passkey of an account not linked on this device", async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);
    const otherAccount = authenticator('other');
    await createPasskeyUnlock(otherAccount, 'another.user', PASSWORD, RP_ID, DEVICE_SALT);
    provider.passkeys.unshift({ ...otherAccount.passkeys[0], id: new Uint8Array([5]) });

    const error = await unlockWithPasskeyGivingPassword(hbAuthClient(PASSWORD), USERNAME, 'posting', 'required', {
      credentials: provider,
      store,
      accounts: [USERNAME, 'another.user']
    }).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'wrong-account');
    assert.equal(store.records.size, 1);
  });

  it("unlocks the account whose linked passkey the user picked in place of the one asked for", async () => {
    const provider = authenticator('passkey');
    const ownRecord = await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);
    const otherAccount = authenticator('other');
    const otherRecord = await createPasskeyUnlock(otherAccount, 'another.user', 'other password', RP_ID, DEVICE_SALT);
    const otherId = new Uint8Array([5]);
    provider.passkeys.unshift({ ...otherAccount.passkeys[0], id: otherId });
    const store = memoryStore(ownRecord, { ...otherRecord, credentialId: otherId });
    const client = hbAuthClient('other password');

    const unlocked = await unlockWithPasskeyGivingPassword(client, USERNAME, 'posting', 'required', {
      credentials: provider,
      store,
      accounts: [USERNAME, 'another.user']
    });

    assert.equal(unlocked.username, 'another.user');
    assert.equal(unlocked.password, 'other password');
    assert.deepEqual(unlocked.status, { ok: true });
    assert.equal(provider.got.length, 1);
    assert.deepEqual(provider.got[0].publicKey?.allowCredentials, []);
    assert.deepEqual(provider.got[0].publicKey?.extensions?.prf?.eval, { first: DEVICE_SALT });
    assert.equal(store.records.size, 2);
  });

  it("switches to an account whose record is on a salt of its own with a second request, then moves it to the device salt", async () => {
    const provider = authenticator('passkey');
    const ownRecord = await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);
    const otherAccount = authenticator('other');
    const otherRecord = await createPasskeyUnlock(otherAccount, 'another.user', 'other password', RP_ID, OWN_SALT);
    const otherId = new Uint8Array([5]);
    provider.passkeys.unshift({ ...otherAccount.passkeys[0], id: otherId });
    const store = memoryStore(ownRecord, { ...otherRecord, credentialId: otherId });
    const client = hbAuthClient('other password');
    const options = { credentials: provider, store, accounts: [USERNAME, 'another.user'] };

    const unlocked = await unlockWithPasskeyGivingPassword(client, USERNAME, 'posting', 'required', options);

    assert.equal(unlocked.username, 'another.user');
    assert.equal(provider.got.length, 2);
    assert.deepEqual(provider.got[0].publicKey?.allowCredentials, []);
    assert.ok(sameId(provider.got[1].publicKey?.allowCredentials?.[0].id ?? new Uint8Array(), otherId));
    assert.deepEqual(store.records.get('another.user')?.prfSalt, DEVICE_SALT);
    assert.deepEqual(store.records.get('another.user')?.credentialId, otherId);
    assert.equal(store.records.get(USERNAME), ownRecord);

    provider.got.length = 0;
    const again = await unlockWithPasskeyGivingPassword(client, USERNAME, 'posting', 'required', options);
    assert.equal(again.username, 'another.user');
    assert.equal(again.password, 'other password');
    assert.equal(provider.got.length, 1);
    assert.deepEqual(provider.got[0].publicKey?.allowCredentials, []);
  });

  it("switches with one request to a device-salt account from a record on a salt of its own, which stays until its own unlock", async () => {
    const provider = authenticator('passkey');
    const ownRecord = await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, OWN_SALT);
    const otherAccount = authenticator('other');
    const otherRecord = await createPasskeyUnlock(otherAccount, 'another.user', 'other password', RP_ID, DEVICE_SALT);
    const otherId = new Uint8Array([5]);
    provider.passkeys.unshift({ ...otherAccount.passkeys[0], id: otherId });
    const store = memoryStore(ownRecord, { ...otherRecord, credentialId: otherId });

    const unlocked = await unlockWithPasskeyGivingPassword(hbAuthClient('other password'), USERNAME, 'posting', 'required', {
      credentials: provider,
      store,
      accounts: [USERNAME, 'another.user']
    });

    assert.equal(unlocked.username, 'another.user');
    assert.equal(provider.got.length, 1);
    assert.deepEqual(provider.got[0].publicKey?.extensions?.prf?.eval, { first: DEVICE_SALT, second: OWN_SALT });
    assert.equal(store.records.get(USERNAME), ownRecord);
  });

  it("rejects as wrong-account another account's passkey where the unlock is for one account only", async () => {
    const provider = authenticator('passkey');
    const ownRecord = await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);
    const otherAccount = authenticator('other');
    const otherRecord = await createPasskeyUnlock(otherAccount, 'another.user', PASSWORD, RP_ID, DEVICE_SALT);
    provider.passkeys.unshift({ ...otherAccount.passkeys[0], id: new Uint8Array([5]) });
    const store = memoryStore(ownRecord, { ...otherRecord, credentialId: new Uint8Array([5]) });

    const error = await unlockWithPasskey(hbAuthClient(PASSWORD), USERNAME, 'posting', 'required', provider, store).catch(
      (e: unknown) => e
    );

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'wrong-account');
    assert.equal(store.records.size, 2);
  });

  it('keeps the record where the prompt fails otherwise, without looking for another passkey', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);

    const error = await unlockWithPasskey(
      hbAuthClient(PASSWORD),
      USERNAME,
      'posting',
      'required',
      authenticator('passkey', new DOMException('Bad origin', 'SecurityError')),
      store
    ).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'failed');
    assert.equal(error.account, undefined, 'no passkey was picked, so no account failed');
    assert.equal(store.records.size, 1);
  });

  it("charges a failed second request to the account whose passkey was picked, keeping every record", async () => {
    const provider = authenticator('passkey');
    const ownRecord = await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);
    const otherAccount = authenticator('other');
    const otherRecord = await createPasskeyUnlock(otherAccount, 'another.user', 'other password', RP_ID, OWN_SALT);
    const otherId = new Uint8Array([5]);
    provider.passkeys.unshift({ ...otherAccount.passkeys[0], id: otherId });
    const store = memoryStore(ownRecord, { ...otherRecord, credentialId: otherId });
    let requests = 0;
    const credentials = {
      create: provider.create,
      get: async (options?: CredentialRequestOptions) => {
        requests += 1;
        if (requests > 1) throw new DOMException('Bad origin', 'SecurityError');
        return provider.get(options);
      }
    };

    const error = await unlockWithPasskeyGivingPassword(hbAuthClient('other password'), USERNAME, 'posting', 'required', {
      credentials,
      store,
      accounts: [USERNAME, 'another.user']
    }).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'failed');
    assert.equal(error.account, 'another.user');
    assert.equal(requests, 2);
    assert.equal(store.records.size, 2);
  });

  it("removes the record of the account whose picked passkey no longer decrypts it, not the one asked for", async () => {
    const provider = authenticator('passkey');
    const ownRecord = await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);
    const otherAccount = authenticator('other');
    const otherRecord = await createPasskeyUnlock(otherAccount, 'another.user', 'other password', RP_ID, DEVICE_SALT);
    const otherId = new Uint8Array([5]);
    provider.passkeys.unshift({ ...otherAccount.passkeys[0], id: otherId, secret: 'changed' });
    const store = memoryStore(ownRecord, { ...otherRecord, credentialId: otherId });

    const error = await unlockWithPasskeyGivingPassword(hbAuthClient('other password'), USERNAME, 'posting', 'required', {
      credentials: provider,
      store,
      accounts: [USERNAME, 'another.user']
    }).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'stale');
    assert.equal(error.account, 'another.user');
    assert.equal(store.records.get(USERNAME), ownRecord);
    assert.equal(store.records.has('another.user'), false);
  });

  it('moves the record, after one password, to the passkey that replaced its own, creating none', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);
    const old = store.records.get(USERNAME);
    provider.replace('replacing passkey');
    const client = hbAuthClient(PASSWORD);

    const error = await unlockWithPasskey(client, USERNAME, 'posting', 'required', provider, store).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyReplacedError);
    assert.equal(error.reason, 'replaced');
    assert.deepEqual(client.passwords, []);
    assert.equal(store.records.get(USERNAME), old);

    await adoptReplacedPasskey(error, 'another.user', PASSWORD);
    assert.equal(store.records.get(USERNAME), old);
    await adoptReplacedPasskey(error, USERNAME, PASSWORD);
    const moved = store.records.get(USERNAME);
    assert.deepEqual(moved?.credentialId, provider.passkeys[0].id);
    assert.deepEqual(moved?.prfSalt, DEVICE_SALT);

    provider.got.length = 0;
    assert.deepEqual(await unlockWithPasskey(client, USERNAME, 'posting', 'required', provider, store), { ok: true });
    assert.equal(provider.got.length, 1);
    assert.deepEqual(client.passwords, [PASSWORD]);
    assert.equal(provider.created(), 1);
  });

  it("moves a record on a salt of its own to the device salt during its unlock, with no further request", async () => {
    const provider = authenticator('passkey');
    const old = await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, OWN_SALT);
    const store = memoryStore({ ...old, transports: ['internal'] });
    const client = hbAuthClient(PASSWORD);

    assert.deepEqual(await unlockWithPasskey(client, USERNAME, 'posting', 'required', provider, store), { ok: true });

    assert.equal(provider.got.length, 1);
    assert.deepEqual(provider.got[0].publicKey?.allowCredentials, []);
    assert.deepEqual(provider.got[0].publicKey?.extensions?.prf?.eval, { first: DEVICE_SALT, second: OWN_SALT });
    const moved = store.records.get(USERNAME);
    assert.deepEqual(moved?.prfSalt, DEVICE_SALT);
    assert.deepEqual(moved?.credentialId, old.credentialId);
    assert.deepEqual(moved?.transports, ['internal']);

    provider.got.length = 0;
    assert.deepEqual(await unlockWithPasskey(client, USERNAME, 'posting', 'required', provider, store), { ok: true });
    assert.deepEqual(provider.got[0].publicKey?.extensions?.prf?.eval, { first: DEVICE_SALT });
    assert.deepEqual(client.passwords, [PASSWORD, PASSWORD]);
  });

  it('keeps a record on a salt of its own, still unlocking, where storing its move fails', async () => {
    const provider = authenticator('passkey');
    const old = await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, OWN_SALT);
    const store = memoryStore(old);
    store.write = async () => Promise.reject(new DOMException('Quota exceeded', 'QuotaExceededError'));

    assert.deepEqual(await unlockWithPasskey(hbAuthClient(PASSWORD), USERNAME, 'posting', 'required', provider, store), {
      ok: true
    });

    assert.equal(store.records.get(USERNAME), old);
  });

  it('keeps a record on a salt of its own where its re-encrypted copy does not decrypt', async () => {
    const provider = authenticator('passkey');
    const old = await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, OWN_SALT);
    const store = memoryStore(old);
    const { subtle } = crypto;
    const decrypt = subtle.decrypt;
    let decrypted = 0;
    // The unlock's own decryption succeeds; the check of the copy, the next one, fails
    subtle.decrypt = async (...args: Parameters<SubtleCrypto['decrypt']>) => {
      decrypted += 1;
      if (decrypted > 1) throw new DOMException('The operation failed', 'OperationError');
      return decrypt.apply(subtle, args);
    };
    try {
      const status = await unlockWithPasskey(hbAuthClient(PASSWORD), USERNAME, 'posting', 'required', provider, store);
      assert.deepEqual(status, { ok: true });
    } finally {
      subtle.decrypt = decrypt;
    }

    assert.equal(decrypted, 2);
    assert.equal(store.records.get(USERNAME), old);
  });

  it('does not move a record whose password safe storage refuses: it is removed', async () => {
    const provider = authenticator('passkey');
    const store = memoryStore(await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, OWN_SALT));

    const error = await unlockWithPasskey(hbAuthClient('changed'), USERNAME, 'posting', 'required', provider, store).catch(
      (e: unknown) => e
    );

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'stale');
    assert.equal(store.records.size, 0);
  });

  it('keeps the record, rejecting with the refusal, when safe storage holds no key of the user', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);

    const error = await unlockWithPasskey(
      hbAuthClient('another password', false),
      USERNAME,
      'posting',
      'required',
      provider,
      store
    ).catch((e: unknown) => e);

    assert.ok(!(error instanceof PasskeyUnlockError));
    assert.ok(error instanceof Error);
    assert.equal(error.name, 'AuthorizationError');
    assert.equal(store.records.size, 1);
  });

  it('rejects as not registered a user without a record', async () => {
    const store = await registered();

    const error = await unlockWithPasskey(
      hbAuthClient(PASSWORD),
      'nobody',
      'posting',
      'required',
      authenticator('passkey'),
      store
    ).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'not-registered');
  });
});

type Signal = { name: string; options: Record<string, unknown> };

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** A browser with WebAuthn's signal methods, recording each signal the app sends */
function signalingBrowser() {
  const sent: Signal[] = [];
  const record = (name: string) => async (options: Record<string, unknown>) => {
    sent.push({ name, options });
  };
  Object.assign(globalThis, {
    PublicKeyCredential: {
      signalUnknownCredential: record('unknown'),
      signalAllAcceptedCredentials: record('all-accepted')
    },
    location: { hostname: RP_ID }
  });
  return sent;
}

describe('passkey signals', () => {
  let sent: Signal[];
  beforeEach(() => {
    sent = signalingBrowser();
  });
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'PublicKeyCredential');
    Reflect.deleteProperty(globalThis, 'location');
  });

  it('a creation tells the providers its credential is the account\'s one passkey, once', async () => {
    const provider = authenticator('passkey');
    const store = memoryStore(await createPasskeyUnlock(provider, 'nobody', PASSWORD, RP_ID, DEVICE_SALT));

    await registerPasskeyUnlock(USERNAME, PASSWORD, provider, store);

    assert.equal(sent.length, 1);
    assert.equal(sent[0].name, 'all-accepted');
    assert.equal(sent[0].options.rpId, RP_ID);
    assert.equal(sent[0].options.userId, base64url(new Uint8Array(provider.passkeys[0].userHandle)));
    assert.deepEqual(sent[0].options.allAcceptedCredentialIds, [base64url(provider.passkeys[0].id)]);
  });

  it('a reuse of the account\'s passkey sends no signal, which could hide another provider\'s', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);
    store.records.clear();

    await reusePasskeyUnlockOf(USERNAME, PASSWORD, provider, store);

    assert.ok(store.records.has(USERNAME));
    assert.deepEqual(sent, []);
  });

  it('cancelling the prompt keeps the record and signals nothing, the passkey staying', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);
    const cancelling = { create: provider.create, get: async () => Promise.reject(cancel()) };

    const error = await unlockWithPasskey(hbAuthClient(PASSWORD), USERNAME, 'posting', 'required', cancelling, store).catch(
      (e: unknown) => e
    );

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
    assert.equal(store.records.size, 1);
    assert.equal(provider.passkeys.length, 1);
    assert.deepEqual(sent, []);
  });

  it('moving a record to the device salt during its unlock signals nothing', async () => {
    const provider = authenticator('passkey');
    const store = memoryStore(await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID, OWN_SALT));

    await unlockWithPasskey(hbAuthClient(PASSWORD), USERNAME, 'posting', 'required', provider, store);

    assert.deepEqual(store.records.get(USERNAME)?.prfSalt, DEVICE_SALT);
    assert.deepEqual(sent, []);
  });

  it('moving a record to the passkey the user picked signals nothing of the record\'s own', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);
    provider.replace('replacing passkey');

    const error = await unlockWithPasskey(hbAuthClient(PASSWORD), USERNAME, 'posting', 'required', provider, store).catch(
      (e: unknown) => e
    );
    assert.ok(error instanceof PasskeyReplacedError);
    await adoptReplacedPasskey(error, USERNAME, PASSWORD);

    assert.deepEqual(store.records.get(USERNAME)?.credentialId, provider.passkeys[0].id);
    assert.deepEqual(sent, []);
  });
});

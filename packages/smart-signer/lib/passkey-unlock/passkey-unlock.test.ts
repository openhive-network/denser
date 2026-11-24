import { describe, it } from 'node:test';
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
const { adoptReplacedPasskey, isPasskeyGone, PasskeyReplacedError, unlockWithPasskey } = await import('./passkey-unlock.ts');
type PasskeyUnlockRecord = Awaited<ReturnType<typeof createPasskeyUnlock>>;

const USERNAME = 'guest4test2';
const PASSWORD = 'safe storage password';
const RP_ID = 'wallet.example';

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

/** The passkey record store, in memory */
function memoryStore(record: PasskeyUnlockRecord) {
  const records = new Map([[record.username, record]]);
  return {
    records,
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
  return memoryStore(await createPasskeyUnlock(provider, USERNAME, PASSWORD, RP_ID));
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

  it('keeps the record when the user cancels the prompt, then picks another account\'s passkey', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);
    const otherAccount = authenticator('other');
    await createPasskeyUnlock(otherAccount, 'another.user', PASSWORD, RP_ID);
    provider.passkeys.unshift({ ...otherAccount.passkeys[0], id: new Uint8Array([5]) });
    const cancelFirst = {
      create: provider.create,
      get: async (options?: CredentialRequestOptions) => {
        if (options?.publicKey?.allowCredentials?.length) throw cancel();
        return provider.get(options);
      }
    };

    const error = await unlockWithPasskey(hbAuthClient(PASSWORD), USERNAME, 'posting', 'required', cancelFirst, store).catch(
      (e: unknown) => e
    );

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'wrong-account');
    assert.equal(store.records.size, 1);
  });

  it('unlocks where the user cancels the prompt and then picks the record\'s own passkey', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);
    const client = hbAuthClient(PASSWORD);
    const cancelFirst = {
      create: provider.create,
      get: async (options?: CredentialRequestOptions) => {
        if (options?.publicKey?.allowCredentials?.length) throw cancel();
        return provider.get(options);
      }
    };

    assert.deepEqual(await unlockWithPasskey(client, USERNAME, 'posting', 'required', cancelFirst, store), { ok: true });
    assert.deepEqual(client.passwords, [PASSWORD]);
    assert.equal(store.records.size, 1);
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
    assert.equal(store.records.size, 1);
  });

  it('drops the record, as gone, where the account has no passkey left, so no later sign-in asks for it', async () => {
    const provider = authenticator('passkey');
    const store = await registered(provider);
    provider.passkeys.length = 0;

    const error = await unlockWithPasskey(hbAuthClient(PASSWORD), USERNAME, 'posting', 'required', provider, store).catch(
      (e: unknown) => e
    );

    assert.ok(isPasskeyGone(error));
    assert.equal(store.records.size, 0);
    assert.equal(provider.got.length, 2);
    assert.equal(provider.got[1].publicKey?.allowCredentials, undefined);
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
    assert.notDeepEqual(moved?.prfSalt, old?.prfSalt);

    provider.got.length = 0;
    assert.deepEqual(await unlockWithPasskey(client, USERNAME, 'posting', 'required', provider, store), { ok: true });
    assert.equal(provider.got.length, 1);
    assert.deepEqual(client.passwords, [PASSWORD]);
    assert.equal(provider.created(), 1);
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

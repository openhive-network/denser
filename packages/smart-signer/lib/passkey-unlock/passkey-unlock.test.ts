import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/passkey-unlock/passkey-unlock-ceremony': new URL('./passkey-unlock-ceremony.ts', import.meta.url).href,
  '@smart-signer/lib/passkey-unlock/passkey-unlock-error': new URL('./passkey-unlock-error.ts', import.meta.url).href,
  '@smart-signer/lib/passkey-unlock/passkey-unlock-store': new URL('./passkey-unlock-store.ts', import.meta.url).href,
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
const { unlockWithPasskey } = await import('./passkey-unlock.ts');
type PasskeyUnlockRecord = Awaited<ReturnType<typeof createPasskeyUnlock>>;

const USERNAME = 'guest4test2';
const PASSWORD = 'safe storage password';
const RP_ID = 'wallet.example';

/** A platform authenticator whose PRF output is a digest of `secret` and the salt */
function authenticator(secret: string, getError?: Error) {
  const prf = (salt: unknown) => {
    assert.ok(salt instanceof Uint8Array);
    return crypto.subtle.digest('SHA-256', new Uint8Array([...new TextEncoder().encode(secret), ...salt]));
  };
  return {
    async create(options?: CredentialCreationOptions) {
      const first = await prf(options?.publicKey?.extensions?.prf?.eval?.first);
      return {
        rawId: new Uint8Array([1, 2, 3]).buffer,
        response: {},
        getClientExtensionResults: () => ({ prf: { enabled: true, results: { first } } })
      } as unknown as Credential;
    },
    async get(options?: CredentialRequestOptions) {
      if (getError) throw getError;
      const first = await prf(options?.publicKey?.extensions?.prf?.eval?.first);
      return { getClientExtensionResults: () => ({ prf: { results: { first } } }) } as unknown as Credential;
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

async function registered(secret = 'passkey') {
  return memoryStore(await createPasskeyUnlock(authenticator(secret), USERNAME, PASSWORD, RP_ID));
}

describe('unlockWithPasskey', () => {
  it('authenticates with the password the passkey gives, and keeps its record', async () => {
    const store = await registered();
    const client = hbAuthClient(PASSWORD);

    const status = await unlockWithPasskey(client, USERNAME, 'posting', 'required', authenticator('passkey'), store);

    assert.deepEqual(status, { ok: true });
    assert.deepEqual(client.passwords, [PASSWORD]);
    assert.equal(store.records.size, 1);
  });

  it('removes a record whose password the passkey does not decrypt, so the offer returns', async () => {
    const store = await registered();
    const client = hbAuthClient(PASSWORD);

    const error = await unlockWithPasskey(client, USERNAME, 'posting', 'required', authenticator('another'), store).catch(
      (e: unknown) => e
    );

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'stale');
    assert.deepEqual(client.passwords, []);
    assert.equal(store.records.size, 0);
  });

  it('removes a record whose password safe storage refuses', async () => {
    const store = await registered();

    const error = await unlockWithPasskey(
      hbAuthClient('the password changed since'),
      USERNAME,
      'posting',
      'required',
      authenticator('passkey'),
      store
    ).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'stale');
    assert.equal(store.records.size, 0);
  });

  it('keeps the record when the user cancels the prompt', async () => {
    const store = await registered();
    const cancel = new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError');

    const error = await unlockWithPasskey(
      hbAuthClient(PASSWORD),
      USERNAME,
      'posting',
      'required',
      authenticator('passkey', cancel),
      store
    ).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
    assert.equal(store.records.size, 1);
  });

  it('keeps the record, rejecting with the refusal, when safe storage holds no key of the user', async () => {
    const store = await registered();

    const error = await unlockWithPasskey(
      hbAuthClient('another password', false),
      USERNAME,
      'posting',
      'required',
      authenticator('passkey'),
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

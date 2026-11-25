import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/passkey-unlock/passkey-unlock-error': new URL('./passkey-unlock-error.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const {
  answersRecordSalt,
  createPasskeyUnlock,
  discoverPasskey,
  isOnDeviceSalt,
  isPasskeyOf,
  isRecordPasskey,
  passkeyUserId,
  pickedPasskeyPassword,
  recoverPasskeyPassword,
  reusePasskeyUnlock
} = await import('./passkey-unlock-ceremony.ts');
type PasskeyCredentials = Parameters<typeof createPasskeyUnlock>[0];
const { PasskeyUnlockError, passkeyEnableMessage } = await import('./passkey-unlock-error.ts');

const USERNAME = 'guest4test2';
const PASSWORD = 'safe storage password';
const RP_ID = 'wallet.example';
const CREDENTIAL_ID = new Uint8Array([7, 7, 7, 7]);
const DEVICE_SALT = new Uint8Array(32).fill(1);
const OTHER_DEVICE_SALT = new Uint8Array(32).fill(2);
/** The salt of its own a record written before the device salt holds */
const OWN_SALT = new Uint8Array(32).fill(3);

type AuthenticatorOptions = {
  /** The PRF output for a salt; another secret stands for a passkey created again */
  secret?: string;
  /** What the authenticator reports of the PRF at creation; `absent` for a browser that omits it */
  prfAtCreation?: 'evaluated' | 'enabled' | 'disabled' | 'absent';
  createError?: Error;
  getError?: Error;
};

type Passkey = { id: Uint8Array<ArrayBuffer>; userHandle: Uint8Array<ArrayBuffer>; secret: string };

const notAllowed = () => new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError');
const sameBytes = (a: BufferSource | undefined, b: Uint8Array) =>
  a instanceof Uint8Array && a.length === b.length && a.every((byte, i) => byte === b[i]);

/**
 * A passkey provider answering navigator.credentials as WebAuthn does, recording each request: it
 * keeps one passkey per user handle (a creation replaces it), and the user picks the first passkey
 * of `passkeys` where the request names no credential. The same provider on two devices stands for
 * one that syncs.
 */
function fakeAuthenticator({ secret = 'secret', prfAtCreation = 'evaluated', createError, getError }: AuthenticatorOptions = {}) {
  const requests: { created: CredentialCreationOptions[]; got: CredentialRequestOptions[] } = { created: [], got: [] };
  const passkeys: Passkey[] = [];
  const prf = async (passkey: Passkey, salt: BufferSource | undefined) => {
    assert.ok(salt instanceof Uint8Array);
    return crypto.subtle.digest('SHA-256', new Uint8Array([...new TextEncoder().encode(passkey.secret), ...salt]));
  };
  const credentials = {
    async create(options?: CredentialCreationOptions) {
      if (options) requests.created.push(options);
      if (createError) throw createError;
      const userHandle = options?.publicKey?.user.id;
      assert.ok(userHandle instanceof Uint8Array);
      const passkey = { id: passkeys.length === 0 ? CREDENTIAL_ID : new Uint8Array([passkeys.length + 1]), userHandle, secret };
      passkeys.splice(0, passkeys.length, ...passkeys.filter((other) => !sameBytes(other.userHandle, userHandle)), passkey);
      const salt = options?.publicKey?.extensions?.prf?.eval?.first;
      const extensions =
        prfAtCreation === 'absent'
          ? {}
          : prfAtCreation === 'evaluated'
            ? { prf: { enabled: true, results: { first: await prf(passkey, salt) } } }
            : { prf: { enabled: prfAtCreation === 'enabled' } };
      return {
        id: 'credential',
        type: 'public-key',
        rawId: passkey.id.buffer,
        response: { getTransports: () => ['internal', 'hybrid', 'quantum'] },
        getClientExtensionResults: () => extensions
      } as unknown as Credential;
    },
    async get(options?: CredentialRequestOptions) {
      if (options) requests.got.push(options);
      if (getError) throw getError;
      const allowed = options?.publicKey?.allowCredentials;
      const passkey = allowed?.length ? passkeys.find(({ id }) => allowed.some((a) => sameBytes(a.id, id))) : passkeys[0];
      if (!passkey) throw notAllowed();
      const { first, second } = options?.publicKey?.extensions?.prf?.eval ?? {};
      const results = { first: await prf(passkey, first), ...(second ? { second: await prf(passkey, second) } : {}) };
      return {
        id: 'credential',
        type: 'public-key',
        rawId: passkey.id.buffer,
        response: { userHandle: passkey.userHandle.buffer },
        getClientExtensionResults: () => ({ prf: { results } })
      } as unknown as Credential;
    }
  };
  return { credentials, requests, passkeys };
}

/** The creation options a passkey of `username` comes from, for a provider set up by hand */
async function creation(username: string): Promise<CredentialCreationOptions> {
  return {
    publicKey: {
      rp: { id: RP_ID, name: 'test' },
      user: { id: await passkeyUserId(username), name: username, displayName: username },
      challenge: new Uint8Array(32),
      pubKeyCredParams: [],
      extensions: { prf: { eval: { first: new Uint8Array(32) } } }
    }
  };
}

/** `provider` seen from another device whose authenticator creates passkeys of `secret` */
function fakeAuthenticatorSharing(provider: ReturnType<typeof fakeAuthenticator>, secret: string): PasskeyCredentials {
  return {
    create: async (options?: CredentialCreationOptions) => {
      const created = await provider.credentials.create(options);
      provider.passkeys[provider.passkeys.length - 1].secret = secret;
      return created;
    },
    get: provider.credentials.get
  };
}

describe('createPasskeyUnlock', () => {
  it('asks once where the authenticator evaluates the PRF at creation, and the passkey decrypts the password', async () => {
    const { credentials, requests } = fakeAuthenticator();

    const record = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);

    assert.equal(requests.created.length, 1);
    assert.equal(requests.got.length, 0);
    assert.equal(requests.created[0].publicKey?.rp.id, RP_ID);
    assert.deepEqual(record.credentialId, CREDENTIAL_ID);
    assert.deepEqual(record.transports, ['internal', 'hybrid']);
    assert.deepEqual(record.prfSalt, DEVICE_SALT);
    assert.deepEqual(requests.created[0].publicKey?.extensions?.prf?.eval?.first, DEVICE_SALT);
    assert.notDeepEqual(new TextDecoder().decode(record.encryptedPassword), PASSWORD);
    assert.equal(await recoverPasskeyPassword(credentials, record, 'required'), PASSWORD);
  });

  it('asks the new passkey for the PRF, by id, transports and relying party, where creation gave none', async () => {
    const { credentials, requests } = fakeAuthenticator({ prfAtCreation: 'enabled' });

    const record = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);

    assert.equal(requests.got.length, 1);
    const request = requests.got[0].publicKey;
    assert.equal(request?.rpId, RP_ID);
    assert.equal(request?.userVerification, 'required');
    assert.deepEqual(request?.allowCredentials, [{ id: CREDENTIAL_ID, type: 'public-key', transports: ['internal', 'hybrid'] }]);
    assert.equal(await recoverPasskeyPassword(credentials, record, 'discouraged'), PASSWORD);
    assert.equal(requests.got[1].publicKey?.userVerification, 'discouraged');
  });

  it('rejects as unsupported, without a second prompt, an authenticator reporting no PRF', async () => {
    const { credentials, requests } = fakeAuthenticator({ prfAtCreation: 'disabled' });

    const error = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'unsupported');
    assert.equal(requests.got.length, 0);
    assert.deepEqual(passkeyEnableMessage(error), { key: 'login_form.passkey_prompt.unsupported', error: true });
  });

  it('rejects as unsupported, without a second prompt, a browser that reports nothing of the PRF', async () => {
    const { credentials, requests } = fakeAuthenticator({ prfAtCreation: 'absent' });

    const error = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'unsupported');
    assert.equal(requests.created.length, 1);
    assert.equal(requests.got.length, 0);
  });

  it('names the same user at every creation for an account, so the authenticator replaces its passkey', async () => {
    const { credentials, requests } = fakeAuthenticator();

    await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);
    await createPasskeyUnlock(credentials, USERNAME, 'another password', RP_ID, DEVICE_SALT);
    await createPasskeyUnlock(credentials, 'another.user', PASSWORD, RP_ID, DEVICE_SALT);

    const [first, second, other] = requests.created.map(({ publicKey }) => publicKey?.user.id);
    assert.ok(first instanceof Uint8Array);
    assert.equal(first.length, 16);
    assert.deepEqual(second, first);
    assert.notDeepEqual(other, first);
  });

  it('rejects as cancelled a browser prompt the user cancelled, or a provider setup that did not finish, with a neutral retry line', async () => {
    const createError = new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError');
    const { credentials } = fakeAuthenticator({ createError });

    const error = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
    assert.equal(error.cause, createError);
    assert.deepEqual(passkeyEnableMessage(error), { key: 'login_form.passkey_prompt.create_cancelled', error: false });
  });

  it('names any other failure with the translated failure message', async () => {
    const { credentials } = fakeAuthenticator({ createError: new DOMException('Bad origin', 'SecurityError') });

    const error = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'failed');
    assert.deepEqual(passkeyEnableMessage(error), { key: 'login_form.passkey_prompt.failed', error: true });
    assert.deepEqual(passkeyEnableMessage(new Error('not a ceremony')), { key: 'login_form.passkey_prompt.failed', error: true });
  });
});

describe('recoverPasskeyPassword', () => {
  it('asks without transports for a record hb-auth wrote', async () => {
    const { credentials, requests } = fakeAuthenticator();
    const { transports: _transports, ...hbAuthRecord } = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);

    assert.equal(await recoverPasskeyPassword(credentials, hbAuthRecord, 'required'), PASSWORD);
    assert.deepEqual(requests.got[0].publicKey?.allowCredentials, [{ id: CREDENTIAL_ID, type: 'public-key' }]);
  });

  it('rejects as stale when another passkey answers, whose PRF does not decrypt the password', async () => {
    const record = await createPasskeyUnlock(fakeAuthenticator().credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);
    const { credentials } = fakeAuthenticator({ secret: 'another passkey' });
    await credentials.create(await creation(record.username));

    const error = await recoverPasskeyPassword(credentials, record, 'required').catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'stale');
  });

  it('rejects as cancelled a prompt the user cancelled', async () => {
    const record = await createPasskeyUnlock(fakeAuthenticator().credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);
    const { credentials } = fakeAuthenticator({ getError: new DOMException('Cancelled', 'AbortError') });

    const error = await recoverPasskeyPassword(credentials, record, 'required').catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
  });

  it('rejects as cancelled, as the browser does, a credential the provider no longer holds', async () => {
    const provider = fakeAuthenticator();
    const record = await createPasskeyUnlock(provider.credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);
    provider.passkeys.length = 0;

    const error = await recoverPasskeyPassword(provider.credentials, record, 'required').catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
  });
});

describe('reusePasskeyUnlock', () => {
  it("keeps the passkey a syncing provider holds for the account, creating none, under the device's salt", async () => {
    const provider = fakeAuthenticator();
    const firstDevice = await createPasskeyUnlock(provider.credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);

    const secondDevice = await reusePasskeyUnlock(provider.credentials, USERNAME, PASSWORD, RP_ID, OTHER_DEVICE_SALT);

    assert.equal(provider.requests.created.length, 1);
    assert.equal(provider.passkeys.length, 1);
    const discovery = provider.requests.got[0].publicKey;
    assert.deepEqual(discovery?.allowCredentials, []);
    assert.equal(discovery?.rpId, RP_ID);
    assert.equal(discovery?.userVerification, 'required');
    assert.deepEqual(discovery?.extensions?.prf?.eval, { first: OTHER_DEVICE_SALT });
    assert.deepEqual(secondDevice.credentialId, firstDevice.credentialId);
    assert.deepEqual(secondDevice.prfSalt, OTHER_DEVICE_SALT);
    assert.equal(await recoverPasskeyPassword(provider.credentials, firstDevice, 'required'), PASSWORD);
    assert.equal(await recoverPasskeyPassword(provider.credentials, secondDevice, 'required'), PASSWORD);
  });

  it("refuses another account's passkey and keeps nothing", async () => {
    const provider = fakeAuthenticator();
    await createPasskeyUnlock(provider.credentials, 'another.user', 'another password', RP_ID, DEVICE_SALT);

    const error = await reusePasskeyUnlock(provider.credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'wrong-account');
    assert.equal(provider.requests.created.length, 1);
  });

  it('rejects as cancelled where the account has no passkey, so creating one is offered next', async () => {
    const provider = fakeAuthenticator();

    const error = await reusePasskeyUnlock(provider.credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
    assert.equal(provider.requests.created.length, 0);
  });
});

describe('discoverPasskey', () => {
  it("names no credential and gives the record's password where the passkey picked is the record's own", async () => {
    const provider = fakeAuthenticator();
    const record = await createPasskeyUnlock(provider.credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);

    const picked = await discoverPasskey(provider.credentials, {
      rpId: RP_ID,
      userVerification: 'discouraged',
      deviceSalt: DEVICE_SALT,
      knownSalt: record.prfSalt
    });

    assert.deepEqual(provider.requests.got[0].publicKey?.allowCredentials, []);
    assert.equal(provider.requests.got[0].publicKey?.userVerification, 'discouraged');
    assert.deepEqual(provider.requests.got[0].publicKey?.extensions?.prf?.eval, { first: DEVICE_SALT });
    assert.ok(isOnDeviceSalt(record, picked));
    assert.ok(await isPasskeyOf(picked, USERNAME));
    assert.ok(!(await isPasskeyOf(picked, 'another.user')));
    assert.ok(isRecordPasskey(record, picked));
    assert.equal(await pickedPasskeyPassword(record, picked), PASSWORD);
  });

  it("asks the device salt first and a record's own salt second, decrypting the record with the second", async () => {
    const provider = fakeAuthenticator();
    const record = await createPasskeyUnlock(provider.credentials, USERNAME, PASSWORD, RP_ID, OWN_SALT);

    const picked = await discoverPasskey(provider.credentials, {
      rpId: RP_ID,
      userVerification: 'required',
      deviceSalt: DEVICE_SALT,
      knownSalt: record.prfSalt
    });

    assert.deepEqual(provider.requests.got[0].publicKey?.allowCredentials, []);
    assert.deepEqual(provider.requests.got[0].publicKey?.extensions?.prf?.eval, { first: DEVICE_SALT, second: OWN_SALT });
    assert.ok(!isOnDeviceSalt(record, picked));
    assert.ok(answersRecordSalt(record, picked));
    assert.deepEqual(picked.passkey.prfSalt, DEVICE_SALT);
    assert.equal(await pickedPasskeyPassword(record, picked), PASSWORD);
  });

  it("rejects as unsupported a record on a salt of its own the request did not ask for", async () => {
    const provider = fakeAuthenticator();
    const record = await createPasskeyUnlock(provider.credentials, USERNAME, PASSWORD, RP_ID, OWN_SALT);

    const picked = await discoverPasskey(provider.credentials, { rpId: RP_ID, userVerification: 'required', deviceSalt: DEVICE_SALT });

    assert.ok(!answersRecordSalt(record, picked));
    const error = await pickedPasskeyPassword(record, picked).catch((e: unknown) => e);
    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'unsupported');
  });

  it('finds the passkey that replaced the record\'s, of the same account, creating none', async () => {
    const provider = fakeAuthenticator();
    const record = await createPasskeyUnlock(provider.credentials, USERNAME, PASSWORD, RP_ID, DEVICE_SALT);
    // Another device enabled the unlock with a creation, which replaced the synced passkey
    await createPasskeyUnlock(fakeAuthenticatorSharing(provider, 'replacing passkey'), USERNAME, PASSWORD, RP_ID, DEVICE_SALT);

    const picked = await discoverPasskey(provider.credentials, {
      rpId: RP_ID,
      userVerification: 'required',
      deviceSalt: DEVICE_SALT,
      knownSalt: record.prfSalt
    });

    assert.ok(await isPasskeyOf(picked, USERNAME));
    assert.ok(!isRecordPasskey(record, picked));
    assert.deepEqual(picked.passkey.credentialId, provider.passkeys[0].id);
    assert.equal(provider.requests.created.length, 2);
  });

  it('rejects as cancelled where no passkey is picked', async () => {
    const provider = fakeAuthenticator({ getError: notAllowed() });

    const error = await discoverPasskey(provider.credentials, {
      rpId: RP_ID,
      userVerification: 'required',
      deviceSalt: DEVICE_SALT
    }).catch(
      (e: unknown) => e
    );

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
  });
});

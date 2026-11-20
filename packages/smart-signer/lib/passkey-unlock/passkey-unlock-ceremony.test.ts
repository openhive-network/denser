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

const { createPasskeyUnlock, recoverPasskeyPassword } = await import('./passkey-unlock-ceremony.ts');
const { PasskeyUnlockError, passkeyEnableFailureKey } = await import('./passkey-unlock-error.ts');

const USERNAME = 'guest4test2';
const PASSWORD = 'safe storage password';
const RP_ID = 'wallet.example';
const CREDENTIAL_ID = new Uint8Array([7, 7, 7, 7]);

type AuthenticatorOptions = {
  /** The PRF output for a salt; another secret stands for a passkey created again */
  secret?: string;
  /** What the authenticator reports of the PRF at creation */
  prfAtCreation?: 'evaluated' | 'enabled' | 'disabled';
  createError?: Error;
  getError?: Error;
};

/** A platform authenticator answering navigator.credentials as WebAuthn does, recording each request */
function fakeAuthenticator({ secret = 'secret', prfAtCreation = 'evaluated', createError, getError }: AuthenticatorOptions = {}) {
  const requests: { created: CredentialCreationOptions[]; got: CredentialRequestOptions[] } = { created: [], got: [] };
  const prf = async (salt: BufferSource | undefined) => {
    assert.ok(salt instanceof Uint8Array);
    return crypto.subtle.digest('SHA-256', new Uint8Array([...new TextEncoder().encode(secret), ...salt]));
  };
  const credentials = {
    async create(options?: CredentialCreationOptions) {
      if (options) requests.created.push(options);
      if (createError) throw createError;
      const salt = options?.publicKey?.extensions?.prf?.eval?.first;
      const extensions =
        prfAtCreation === 'evaluated'
          ? { prf: { enabled: true, results: { first: await prf(salt) } } }
          : { prf: { enabled: prfAtCreation === 'enabled' } };
      return {
        id: 'credential',
        type: 'public-key',
        rawId: CREDENTIAL_ID.buffer,
        response: { getTransports: () => ['internal', 'hybrid', 'quantum'] },
        getClientExtensionResults: () => extensions
      } as unknown as Credential;
    },
    async get(options?: CredentialRequestOptions) {
      if (options) requests.got.push(options);
      if (getError) throw getError;
      const results = { first: await prf(options?.publicKey?.extensions?.prf?.eval?.first) };
      return { id: 'credential', type: 'public-key', getClientExtensionResults: () => ({ prf: { results } }) } as unknown as Credential;
    }
  };
  return { credentials, requests };
}

describe('createPasskeyUnlock', () => {
  it('asks once where the authenticator evaluates the PRF at creation, and the passkey decrypts the password', async () => {
    const { credentials, requests } = fakeAuthenticator();

    const record = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID);

    assert.equal(requests.created.length, 1);
    assert.equal(requests.got.length, 0);
    assert.equal(requests.created[0].publicKey?.rp.id, RP_ID);
    assert.deepEqual(record.credentialId, CREDENTIAL_ID);
    assert.deepEqual(record.transports, ['internal', 'hybrid']);
    assert.notDeepEqual(new TextDecoder().decode(record.encryptedPassword), PASSWORD);
    assert.equal(await recoverPasskeyPassword(credentials, record, 'required'), PASSWORD);
  });

  it('asks the new passkey for the PRF, by id, transports and relying party, where creation gave none', async () => {
    const { credentials, requests } = fakeAuthenticator({ prfAtCreation: 'enabled' });

    const record = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID);

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

    const error = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'unsupported');
    assert.equal(requests.got.length, 0);
    assert.equal(passkeyEnableFailureKey(error), 'login_form.passkey_prompt.unsupported');
  });

  it('rejects as cancelled a browser prompt the user cancelled, which needs no message', async () => {
    const createError = new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError');
    const { credentials } = fakeAuthenticator({ createError });

    const error = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
    assert.equal(error.cause, createError);
    assert.equal(passkeyEnableFailureKey(error), null);
  });

  it('names any other failure with the translated failure message', async () => {
    const { credentials } = fakeAuthenticator({ createError: new DOMException('Bad origin', 'SecurityError') });

    const error = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID).catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'failed');
    assert.equal(passkeyEnableFailureKey(error), 'login_form.passkey_prompt.failed');
    assert.equal(passkeyEnableFailureKey(new Error('not a ceremony')), 'login_form.passkey_prompt.failed');
  });
});

describe('recoverPasskeyPassword', () => {
  it('asks without transports for a record hb-auth wrote', async () => {
    const { credentials, requests } = fakeAuthenticator();
    const { transports: _transports, ...hbAuthRecord } = await createPasskeyUnlock(credentials, USERNAME, PASSWORD, RP_ID);

    assert.equal(await recoverPasskeyPassword(credentials, hbAuthRecord, 'required'), PASSWORD);
    assert.deepEqual(requests.got[0].publicKey?.allowCredentials, [{ id: CREDENTIAL_ID, type: 'public-key' }]);
  });

  it('rejects as failed when another passkey answers, whose PRF does not decrypt the password', async () => {
    const record = await createPasskeyUnlock(fakeAuthenticator().credentials, USERNAME, PASSWORD, RP_ID);
    const { credentials } = fakeAuthenticator({ secret: 'another passkey' });

    const error = await recoverPasskeyPassword(credentials, record, 'required').catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'failed');
  });

  it('rejects as cancelled a prompt the user cancelled', async () => {
    const record = await createPasskeyUnlock(fakeAuthenticator().credentials, USERNAME, PASSWORD, RP_ID);
    const { credentials } = fakeAuthenticator({ getError: new DOMException('Cancelled', 'AbortError') });

    const error = await recoverPasskeyPassword(credentials, record, 'required').catch((e: unknown) => e);

    assert.ok(error instanceof PasskeyUnlockError);
    assert.equal(error.reason, 'cancelled');
  });
});

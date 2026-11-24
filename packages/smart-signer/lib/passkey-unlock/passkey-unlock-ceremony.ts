import { ceremonyError, PasskeyUnlockError } from '@smart-signer/lib/passkey-unlock/passkey-unlock-error';

/**
 * A passkey unlocking safe storage: the password, encrypted with AES-GCM under the passkey's PRF
 * output for `prfSalt`. The fields and their encoding are hb-auth's (its `hasPasskey`,
 * `removePasskey` and `biometricUnlock` read the same record); `transports`, which hb-auth does not
 * write, is ours.
 */
export type PasskeyUnlockRecord = {
  username: string;
  credentialId: Uint8Array<ArrayBuffer>;
  prfSalt: Uint8Array<ArrayBuffer>;
  encryptedPassword: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  rpId: string;
  createdAt: number;
  transports?: AuthenticatorTransport[];
};

export type PasskeyCredentials = Pick<CredentialsContainer, 'create' | 'get'>;

const RELYING_PARTY_NAME = 'Hive Safe Storage';
const CEREMONY_TIMEOUT_MS = 120_000;
const ES256 = -7;
const RS256 = -257;
const ENCRYPTION = 'AES-GCM';
const AUTHENTICATOR_TRANSPORTS: ReadonlySet<string> = new Set(['ble', 'hybrid', 'internal', 'nfc', 'usb']);
const USER_ID_LENGTH = 16;
const USER_ID_CONTEXT = 'hive-safe-storage-passkey:';

const randomBytes = (length: number) => crypto.getRandomValues(new Uint8Array(length));

const isAuthenticatorTransport = (transport: string): transport is AuthenticatorTransport =>
  AUTHENTICATOR_TRANSPORTS.has(transport);

function isPublicKeyCredential(credential: Credential | null): credential is PublicKeyCredential {
  return credential !== null && 'getClientExtensionResults' in credential;
}

/** The transports the authenticator of a new credential named, which point the browser straight at it */
function credentialTransports({ response }: PublicKeyCredential): AuthenticatorTransport[] {
  const transports = 'getTransports' in response && typeof response.getTransports === 'function' ? response.getTransports() : [];
  return Array.isArray(transports) ? transports.filter(isAuthenticatorTransport) : [];
}

/**
 * The WebAuthn user handle of `username`'s passkey, the same at every creation: an authenticator
 * replaces the passkey it holds for the relying party and handle, so enabling the unlock again
 * leaves no orphan passkey behind, and a passkey found without naming its credential is known by it
 */
export async function passkeyUserId(username: string): Promise<Uint8Array<ArrayBuffer>> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(USER_ID_CONTEXT + username));
  return new Uint8Array(digest.slice(0, USER_ID_LENGTH));
}

async function prfKey(prfOutput: BufferSource, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', prfOutput, ENCRYPTION, false, usages);
}

const sameBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i]);

/**
 * A passkey of the account, and the key its PRF output for `prfSalt` gives, which encrypts the
 * password of a record of this device: one passkey a provider syncs serves every device, each
 * with its own salt
 */
export type FoundPasskey = {
  credentialId: Uint8Array<ArrayBuffer>;
  transports?: AuthenticatorTransport[];
  prfSalt: Uint8Array<ArrayBuffer>;
  key: CryptoKey;
};

type Assertion = {
  credentialId: Uint8Array<ArrayBuffer>;
  transports?: AuthenticatorTransport[];
  prfSalt: Uint8Array<ArrayBuffer>;
  rpId: string;
  userVerification: UserVerificationRequirement;
};

/** The PRF output of the passkey `credentialId` for `prfSalt`, from an assertion the user approves */
async function evaluatePrf(
  credentials: PasskeyCredentials,
  assertion: Assertion,
  step: string,
  signal?: AbortSignal
): Promise<BufferSource> {
  const { credentialId, transports, prfSalt, rpId, userVerification } = assertion;
  let credential: Credential | null;
  try {
    credential = await credentials.get({
      signal,
      publicKey: {
        challenge: randomBytes(32),
        rpId,
        allowCredentials: [{ id: credentialId, type: 'public-key', ...(transports?.length ? { transports } : {}) }],
        userVerification,
        timeout: CEREMONY_TIMEOUT_MS,
        extensions: { prf: { eval: { first: prfSalt } } }
      }
    });
  } catch (error) {
    throw ceremonyError(step, error);
  }
  if (!isPublicKeyCredential(credential)) throw new PasskeyUnlockError(`${step}: no credential`, 'failed');
  const output = credential.getClientExtensionResults().prf?.results?.first;
  if (!output) throw new PasskeyUnlockError(`${step}: the passkey gave no PRF output`, 'unsupported');
  return output;
}

/**
 * Creates a platform passkey for `username`, in place of the one this authenticator held for it,
 * and encrypts `password` under its PRF output: one prompt where the authenticator evaluates the
 * PRF at creation, otherwise a second one asking the new passkey for it. Rejects with
 * PasskeyUnlockError, as unsupported, before a second prompt, unless the PRF is enabled.
 */
export async function createPasskeyUnlock(
  credentials: PasskeyCredentials,
  username: string,
  password: string,
  rpId: string
): Promise<PasskeyUnlockRecord> {
  const prfSalt = randomBytes(32);
  let credential: Credential | null;
  try {
    credential = await credentials.create({
      publicKey: {
        rp: { name: RELYING_PARTY_NAME, id: rpId },
        user: { id: await passkeyUserId(username), name: username, displayName: username },
        challenge: randomBytes(32),
        pubKeyCredParams: [
          { alg: ES256, type: 'public-key' },
          { alg: RS256, type: 'public-key' }
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: CEREMONY_TIMEOUT_MS,
        extensions: { prf: { eval: { first: prfSalt } } }
      }
    });
  } catch (error) {
    throw ceremonyError('Passkey creation', error);
  }
  if (!isPublicKeyCredential(credential)) throw new PasskeyUnlockError('Passkey creation: no credential', 'failed');
  const prf = credential.getClientExtensionResults().prf;
  // A browser that omits the extension's result has no PRF either, as hb-auth assumed
  if (prf?.enabled !== true) throw new PasskeyUnlockError('Passkey creation: the authenticator has no PRF', 'unsupported');

  const credentialId = new Uint8Array(credential.rawId);
  const transports = credentialTransports(credential);
  const prfOutput =
    prf.results?.first ??
    (await evaluatePrf(
      credentials,
      { credentialId, transports, prfSalt, rpId, userVerification: 'required' },
      'PRF evaluation'
    ));
  return wrapPassword(username, password, rpId, {
    credentialId,
    transports,
    prfSalt,
    key: await prfKey(prfOutput, ['encrypt', 'decrypt'])
  });
}

/**
 * The record of this device holding `password` encrypted under `passkey`'s key. Rejects with
 * PasskeyUnlockError, as failed, when the encrypted password does not decrypt.
 */
export async function wrapPassword(
  username: string,
  password: string,
  rpId: string,
  { credentialId, transports, prfSalt, key }: FoundPasskey
): Promise<PasskeyUnlockRecord> {
  const iv = randomBytes(12);
  const encoded = new TextEncoder().encode(password);
  const encryptedPassword = new Uint8Array(await crypto.subtle.encrypt({ name: ENCRYPTION, iv }, key, encoded));
  const record = { username, credentialId, prfSalt, encryptedPassword, iv, rpId, createdAt: Date.now(), transports };
  if ((await decryptWith(record, key).catch(() => null)) !== password) {
    throw new PasskeyUnlockError('Passkey unlock: the encrypted password does not decrypt', 'failed');
  }
  return record;
}

type Discovery = {
  rpId: string;
  userVerification: UserVerificationRequirement;
  knownSalt?: BufferSource;
  signal?: AbortSignal;
};

/**
 * A passkey of the relying party the user picked from a request naming no credential: the user
 * handle it carries (null where it carries none), its key for a fresh salt, and its PRF output
 * for the request's `knownSalt`, where given
 */
export type PickedPasskey = { userHandle: Uint8Array | null; passkey: FoundPasskey; knownOutput?: BufferSource };

/**
 * The passkey the user picks of any account, wherever its provider keeps it, from an assertion
 * naming no credential: a credential the provider replaced is never named, so the browser has no
 * "no passkeys" dialog to show for it. Rejects with PasskeyUnlockError: cancelled where no passkey
 * was picked (the browser answers a relying party without passkeys as it does a cancel, and an
 * aborted request so too), unsupported without PRF.
 */
export async function discoverPasskey(
  credentials: PasskeyCredentials,
  { rpId, userVerification, knownSalt, signal }: Discovery
): Promise<PickedPasskey> {
  const step = 'Passkey discovery';
  const prfSalt = randomBytes(32);
  let credential: Credential | null;
  try {
    credential = await credentials.get({
      signal,
      publicKey: {
        challenge: randomBytes(32),
        rpId,
        allowCredentials: [],
        userVerification,
        timeout: CEREMONY_TIMEOUT_MS,
        extensions: { prf: { eval: { first: prfSalt, ...(knownSalt ? { second: knownSalt } : {}) } } }
      }
    });
  } catch (error) {
    throw ceremonyError(step, error);
  }
  if (!isPublicKeyCredential(credential)) throw new PasskeyUnlockError(`${step}: no credential`, 'failed');
  const { response } = credential;
  const userHandle = 'userHandle' in response && response.userHandle instanceof ArrayBuffer ? response.userHandle : null;
  const results = credential.getClientExtensionResults().prf?.results;
  if (!results?.first) throw new PasskeyUnlockError(`${step}: the passkey gave no PRF output`, 'unsupported');
  const key = await prfKey(results.first, ['encrypt', 'decrypt']);
  return {
    userHandle: userHandle && new Uint8Array(userHandle),
    passkey: { credentialId: new Uint8Array(credential.rawId), prfSalt, key },
    knownOutput: results.second
  };
}

/** Whether `picked` is a passkey of `username`, by the user handle every passkey of the account is created with */
export async function isPasskeyOf(picked: PickedPasskey, username: string): Promise<boolean> {
  return picked.userHandle !== null && sameBytes(picked.userHandle, await passkeyUserId(username));
}

/** Whether `picked` is the very credential `record` was made with, not another passkey of its account */
export const isRecordPasskey = (record: PasskeyUnlockRecord, picked: PickedPasskey) =>
  sameBytes(picked.passkey.credentialId, record.credentialId);

/**
 * Encrypts `password` under a passkey the account already has, synced from another device or
 * left by an earlier record, in a record of this device, creating none. Rejects with
 * PasskeyUnlockError as `discoverPasskey` does, and as wrong-account for another account's passkey.
 */
export async function reusePasskeyUnlock(
  credentials: PasskeyCredentials,
  username: string,
  password: string,
  rpId: string
): Promise<PasskeyUnlockRecord> {
  const picked = await discoverPasskey(credentials, { rpId, userVerification: 'required' });
  if (!(await isPasskeyOf(picked, username))) {
    throw new PasskeyUnlockError(`Passkey discovery: the passkey picked is not ${username}'s`, 'wrong-account');
  }
  return wrapPassword(username, password, rpId, picked.passkey);
}

/**
 * The password `record` holds, decrypted with the PRF output `picked`, its own passkey, gave for
 * the record's salt. Rejects with PasskeyUnlockError: stale where it does not decrypt, unsupported
 * where the request asked for no output of the record's salt.
 */
export async function pickedPasskeyPassword(record: PasskeyUnlockRecord, picked: PickedPasskey): Promise<string> {
  if (!picked.knownOutput) throw new PasskeyUnlockError('Passkey unlock: the passkey gave no PRF output', 'unsupported');
  return decryptPassword(record, picked.knownOutput);
}

/** The password of `record` decrypted with `prfOutput`. Rejects with PasskeyUnlockError, as stale. */
async function decryptPassword(record: PasskeyUnlockRecord, prfOutput: BufferSource): Promise<string> {
  try {
    return await decryptWith(record, await prfKey(prfOutput, ['decrypt']));
  } catch (error) {
    throw new PasskeyUnlockError('Passkey unlock: the stored password does not decrypt', 'stale', { cause: error });
  }
}

async function decryptWith(record: PasskeyUnlockRecord, key: CryptoKey): Promise<string> {
  const decrypted = await crypto.subtle.decrypt({ name: ENCRYPTION, iv: record.iv }, key, record.encryptedPassword);
  return new TextDecoder().decode(decrypted);
}

/**
 * The password `record` holds, decrypted with its passkey's PRF output, from a request naming its
 * credential: for a passkey that has just answered, whose provider holds it. Rejects with
 * PasskeyUnlockError, as stale when the output does not decrypt it.
 */
export async function recoverPasskeyPassword(
  credentials: PasskeyCredentials,
  record: PasskeyUnlockRecord,
  userVerification: UserVerificationRequirement,
  signal?: AbortSignal
): Promise<string> {
  const prfOutput = await evaluatePrf(credentials, { ...record, userVerification }, 'Passkey unlock', signal);
  return decryptPassword(record, prfOutput);
}

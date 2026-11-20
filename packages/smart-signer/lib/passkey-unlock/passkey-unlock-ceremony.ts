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

async function prfKey(prfOutput: BufferSource, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', prfOutput, ENCRYPTION, false, [usage]);
}

type Assertion = {
  credentialId: Uint8Array<ArrayBuffer>;
  transports?: AuthenticatorTransport[];
  prfSalt: Uint8Array<ArrayBuffer>;
  rpId: string;
  userVerification: UserVerificationRequirement;
};

/** The PRF output of the passkey `credentialId` for `prfSalt`, from an assertion the user approves */
async function evaluatePrf(credentials: PasskeyCredentials, assertion: Assertion, step: string): Promise<BufferSource> {
  const { credentialId, transports, prfSalt, rpId, userVerification } = assertion;
  let credential: Credential | null;
  try {
    credential = await credentials.get({
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
 * Creates a platform passkey for `username` and encrypts `password` under its PRF output: one
 * prompt where the authenticator evaluates the PRF at creation, otherwise a second one asking the
 * new passkey for it. Rejects with PasskeyUnlockError.
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
        user: { id: randomBytes(16), name: username, displayName: username },
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
  if (prf?.enabled === false) throw new PasskeyUnlockError('Passkey creation: the authenticator has no PRF', 'unsupported');

  const credentialId = new Uint8Array(credential.rawId);
  const transports = credentialTransports(credential);
  const prfOutput =
    prf?.results?.first ??
    (await evaluatePrf(
      credentials,
      { credentialId, transports, prfSalt, rpId, userVerification: 'required' },
      'PRF evaluation'
    ));
  const iv = randomBytes(12);
  const key = await prfKey(prfOutput, 'encrypt');
  const encoded = new TextEncoder().encode(password);
  const encryptedPassword = new Uint8Array(await crypto.subtle.encrypt({ name: ENCRYPTION, iv }, key, encoded));
  return { username, credentialId, prfSalt, encryptedPassword, iv, rpId, createdAt: Date.now(), transports };
}

/** The password `record` holds, decrypted with its passkey's PRF output. Rejects with PasskeyUnlockError. */
export async function recoverPasskeyPassword(
  credentials: PasskeyCredentials,
  record: PasskeyUnlockRecord,
  userVerification: UserVerificationRequirement
): Promise<string> {
  const prfOutput = await evaluatePrf(credentials, { ...record, userVerification }, 'Passkey unlock');
  try {
    const key = await prfKey(prfOutput, 'decrypt');
    const decrypted = await crypto.subtle.decrypt({ name: ENCRYPTION, iv: record.iv }, key, record.encryptedPassword);
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new PasskeyUnlockError('Passkey unlock: the stored password does not decrypt', 'failed', { cause: error });
  }
}

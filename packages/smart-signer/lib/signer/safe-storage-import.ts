import type { KeyAuthorityType, OnlineClient } from '@hiveio/hb-auth';
import { addedKeyStrictMode } from '@smart-signer/lib/signer/safe-storage-registration';
import {
  authenticateStoredKey,
  unlockBeforeKeyWrite,
  type SafeStorageUnlockClient
} from '@smart-signer/lib/auth/safe-storage-unlock';

/** What importing keys into safe storage, and checking it signs with them, needs of hb-auth's client */
export type SafeStorageImportClient = SafeStorageUnlockClient & Pick<OnlineClient, 'register' | 'sign' | 'getUserSettings'>;

export interface WifKey {
  keyType: KeyAuthorityType;
  wif: string;
}

/** Tells which key made a signature, as wax computes public keys */
export interface KeyCheck {
  publicKeyOf: (wif: string) => string;
  signingKeyOf: (digest: string, signature: string) => string;
}

/** Safe storage signs the `keyType` key of the account with another key than the one being imported */
export class SafeStorageKeyMismatchError extends Error {
  readonly keyType: KeyAuthorityType;

  constructor(keyType: KeyAuthorityType) {
    super(`Safe storage holds another ${keyType} key than the one imported`);
    this.name = 'SafeStorageKeyMismatchError';
    this.keyType = keyType;
  }
}

const DIGEST_BYTES = 32;

function randomDigest(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(DIGEST_BYTES)), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

/** Whether the unlocked safe storage of `username` signs `key`'s type with `key` */
async function signsWith(client: SafeStorageImportClient, username: string, key: WifKey, check: KeyCheck) {
  const digest = randomDigest();
  const signature = await client.sign(username, digest, key.keyType);
  return check.signingKeyOf(digest, signature) === check.publicKeyOf(key.wif);
}

/**
 * The keys of `keys` the safe storage of `username` already holds: those its unlocked wallet signs
 * with for their key type. None while the wallet is locked, as it cannot sign then.
 */
export async function keysHeldInSafeStorage(
  client: SafeStorageImportClient,
  username: string,
  keys: readonly WifKey[],
  check: KeyCheck
): Promise<WifKey[]> {
  const user = await client.getRegisteredUserByUsername(username);
  if (!user?.unlocked) return [];
  const held: WifKey[] = [];
  for (const key of keys) {
    if (user.registeredKeyTypes.includes(key.keyType) && (await signsWith(client, username, key, check))) held.push(key);
  }
  return held;
}

/**
 * Imports `keys` into the safe storage wallet of `username`, then checks that the wallet signs with
 * each of them. A wallet safe storage does not hold yet is created with `password`; an existing one
 * is unlocked with it before anything is written, so a wrong password writes nothing. A key type the
 * wallet already holds is not written over: the check then tells whether it holds the same key.
 * Keys get the Direct Authority Mode the wallet's other keys have, strict for a new wallet.
 *
 * @throws {WrongSafeStoragePasswordError} when the existing wallet refused `password`
 * @throws {SafeStorageKeyMismatchError} when the wallet signs a key type with another key than given
 */
export async function importKeysIntoSafeStorage(
  client: SafeStorageImportClient,
  username: string,
  password: string,
  keys: readonly WifKey[],
  check: KeyCheck
): Promise<void> {
  if (!keys.length) return;
  const registered = (await client.getRegisteredUserByUsername(username))?.registeredKeyTypes ?? [];
  if (registered.length) await unlockBeforeKeyWrite(client, username, password, registered[0]);

  for (const { keyType, wif } of keys) {
    if (registered.includes(keyType)) continue;
    const settings = await client.getUserSettings(username);
    const status = await client.register(username, password, wif, keyType, addedKeyStrictMode(settings, keyType));
    if (!status.ok) throw new Error(`Safe storage refused the ${keyType} key`, { cause: status.error });
  }

  if (!(await client.getRegisteredUserByUsername(username))?.unlocked) {
    await authenticateStoredKey(client, username, password, keys[0].keyType);
  }
  for (const key of keys) {
    if (!(await signsWith(client, username, key, check))) throw new SafeStorageKeyMismatchError(key.keyType);
  }
}

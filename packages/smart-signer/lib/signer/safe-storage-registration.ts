import type { KeyAuthorityType, OnlineClient } from '@hiveio/hb-auth';

/** What registering a key needs of hb-auth's client */
export type SafeStorageClient = Pick<OnlineClient, 'register' | 'getRegisteredUserByUsername' | 'getUserSettings'>;

export interface SafeStorageKey {
  username: string;
  /** The safe storage password */
  password: string;
  wif: string;
  keyType: KeyAuthorityType;
  /** Direct Authority Mode: false accepts a key of an account listed in the user's `account_auths` */
  strict: boolean;
}

export interface SharedKeyLookup {
  /** The other key types whose authority lists the key, as `findSharedKeyTypes` in shared-key-types.ts */
  findSharedKeyTypes: (username: string, keyType: KeyAuthorityType, wif: string) => Promise<KeyAuthorityType[]>;
  /** Told of each other key type the key could not be registered for */
  onSharedKeyError: (error: unknown, keyType: KeyAuthorityType) => void;
}

/**
 * Registers `key` in safe storage, then, with the same password and Direct Authority Mode, for each
 * other key type it is also the key of that safe storage does not hold yet: an account using one key
 * pair for posting and active gets a session holding both.
 *
 * Rejects when `key` cannot be registered for its own type. A failure for another type goes to
 * `onSharedKeyError` and leaves the key held for its own type only.
 */
export async function registerSafeStorageKey(
  client: SafeStorageClient,
  key: SafeStorageKey,
  { findSharedKeyTypes, onSharedKeyError }: SharedKeyLookup
): Promise<void> {
  const { username, password, wif, keyType, strict } = key;
  await client.register(username, password, wif, keyType, strict);

  const sharedKeyTypes = await findSharedKeyTypes(username, keyType, wif);
  if (!sharedKeyTypes.length) return;
  const registered = (await client.getRegisteredUserByUsername(username))?.registeredKeyTypes ?? [];
  for (const sharedKeyType of sharedKeyTypes.filter((type) => !registered.includes(type))) {
    try {
      await client.register(username, password, wif, sharedKeyType, strict);
    } catch (error) {
      onSharedKeyError(error, sharedKeyType);
    }
  }
}

/**
 * Registers a key added to a session that signed in with its `sessionKeyType` key, as
 * `registerSafeStorageKey` does, in the Direct Authority Mode that key was registered with: strict
 * when safe storage does not say.
 */
export async function registerAddedSafeStorageKey(
  client: SafeStorageClient,
  key: Omit<SafeStorageKey, 'strict'>,
  sessionKeyType: KeyAuthorityType,
  lookup: SharedKeyLookup
): Promise<void> {
  const settings = await client.getUserSettings(key.username);
  const strict = settings?.strict[sessionKeyType] ?? true;
  await registerSafeStorageKey(client, { ...key, strict }, lookup);
}

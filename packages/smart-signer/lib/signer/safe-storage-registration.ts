import type { KeyAuthorityType, OnlineClient } from '@hiveio/hb-auth';

/** What registering a key needs of hb-auth's client */
export type SafeStorageClient = Pick<OnlineClient, 'register' | 'getRegisteredUserByUsername' | 'getUserSettings'>;

/** What safe storage keeps of an account's Direct Authority Mode, per key type */
export type StrictModeSettings = Pick<NonNullable<Awaited<ReturnType<OnlineClient['getUserSettings']>>>, 'strict'>;

/**
 * The Direct Authority Mode safe storage unlocks the `keyType` key of an account with: the stored
 * one, strict when safe storage does not say, as hb-auth's `authenticate` does.
 */
export function storedStrictMode(settings: StrictModeSettings | null | undefined, keyType: KeyAuthorityType): boolean {
  return settings?.strict[keyType] ?? true;
}

/**
 * The Direct Authority Mode a key added for `keyType` defaults to: the one stored for that key
 * type, else for another key type of the account, else strict, as at the account's first save.
 */
export function addedKeyStrictMode(settings: StrictModeSettings | null | undefined, keyType: KeyAuthorityType): boolean {
  const strict = settings?.strict ?? {};
  return strict[keyType] ?? Object.values(strict).find((mode) => mode !== undefined) ?? true;
}

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
  const strict = storedStrictMode(settings, sessionKeyType);
  await registerSafeStorageKey(client, { ...key, strict }, lookup);
}

/** What registering a key, and removing it again, needs of hb-auth's client */
export type RevocableSafeStorageClient = SafeStorageClient & Pick<OnlineClient, 'invalidateExistingKey'>;

/**
 * Registers a key added to a session as `registerAddedSafeStorageKey` does, then calls
 * `requireSession`. When that throws, as when the user signed out while the key was registered,
 * every key type the registration added is removed again and its error rethrown. A key type that
 * cannot be removed goes to `onRemoveError`.
 */
export async function registerAddedSafeStorageKeyWithin(
  client: RevocableSafeStorageClient,
  key: Omit<SafeStorageKey, 'strict'>,
  sessionKeyType: KeyAuthorityType,
  lookup: SharedKeyLookup,
  requireSession: () => void,
  onRemoveError: (error: unknown, keyType: KeyAuthorityType) => void
): Promise<void> {
  const registeredKeyTypes = async () =>
    (await client.getRegisteredUserByUsername(key.username))?.registeredKeyTypes ?? [];
  const registeredBefore = await registeredKeyTypes();
  await registerAddedSafeStorageKey(client, key, sessionKeyType, lookup);
  try {
    requireSession();
  } catch (sessionError) {
    const added = (await registeredKeyTypes()).filter((keyType) => !registeredBefore.includes(keyType));
    for (const keyType of added) {
      try {
        await client.invalidateExistingKey(key.username, keyType);
      } catch (error) {
        onRemoveError(error, keyType);
      }
    }
    throw sessionError;
  }
}

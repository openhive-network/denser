/**
 * Storage keys of the credentials signers keep for an account (HiveAuth tokens, Google Drive tokens,
 * and WIF keys earlier versions stored in plaintext), so several signed-in accounts of one login
 * method each keep their own.
 */

const WIF_KEY_PREFIX = 'wif.';
/** The key types a WIF session signs with; the owner key is never stored */
const WIF_KEY_TYPES = ['posting', 'active'];
const LEGACY_HIVEAUTH_KEY = 'hiveAuthData';
const LEGACY_GOOGLE_REFRESH_TOKEN_KEY = 'google_refresh_token';
const LEGACY_GOOGLE_ENCRYPTION_KEY_WIF_KEY = 'gdrive_encryption_key_wif';
const LEGACY_KEYS = [LEGACY_HIVEAUTH_KEY, LEGACY_GOOGLE_REFRESH_TOKEN_KEY, LEGACY_GOOGLE_ENCRYPTION_KEY_WIF_KEY];

/** Per-account credential, and the single entry all accounts shared before it was per account. */
export interface CredentialKey {
  key: string;
  legacyKey: string;
}

export function wifCredentialKey(username: string, keyType: string): string {
  return `${WIF_KEY_PREFIX}${username}@${keyType}`;
}

/**
 * The key types the WIF key stored as `username`'s `keyType` key is stored as, `keyType` among
 * them: more than one for an account using one key pair for several. None when no key is stored.
 */
export function storedWifKeyTypes(storage: Storage, username: string, keyType: string): string[] {
  const wif = storage.getItem(wifCredentialKey(username, keyType));
  if (wif === null) return [];
  return WIF_KEY_TYPES.filter((type) => storage.getItem(wifCredentialKey(username, type)) === wif);
}

/** A WIF key stored in plaintext by an earlier version, before keys were kept in safe storage only */
export interface StoredWifKey {
  keyType: string;
  wif: string;
}

/** The WIF keys stored in plaintext for `username`, posting first. */
export function storedWifKeys(storage: Storage, username: string): StoredWifKey[] {
  const keys: StoredWifKey[] = [];
  for (const keyType of WIF_KEY_TYPES) {
    const wif = parseStoredWif(storage.getItem(wifCredentialKey(username, keyType)));
    if (wif) keys.push({ keyType, wif });
  }
  return keys;
}

/** The WIF key in a stored entry (JSON text); null for none, or for an entry that is not one */
export function parseStoredWif(stored: string | null): string | null {
  if (!stored) return null;
  try {
    const wif: unknown = JSON.parse(stored);
    return typeof wif === 'string' && wif ? wif : null;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

/** Remove the plaintext WIF keys of `keyTypes` stored for `username`. */
export function removeStoredWifKeys(storage: Storage, username: string, keyTypes: readonly string[]): void {
  for (const keyType of keyTypes) storage.removeItem(wifCredentialKey(username, keyType));
}

export function hiveAuthCredentialKey(username: string): CredentialKey {
  return { key: `${LEGACY_HIVEAUTH_KEY}.${username}`, legacyKey: LEGACY_HIVEAUTH_KEY };
}

export function googleRefreshTokenCredentialKey(username: string): CredentialKey {
  return { key: `${LEGACY_GOOGLE_REFRESH_TOKEN_KEY}.${username}`, legacyKey: LEGACY_GOOGLE_REFRESH_TOKEN_KEY };
}

/**
 * Remove the Google Drive wallet encryption keys earlier versions stored, of every account and the
 * entry they all shared: the key now lives in the page's memory only (tab-credentials.ts).
 */
export function clearStoredDriveEncryptionKeys(storage: Storage): void {
  for (const key of storageKeys(storage)) {
    if (isDriveEncryptionKey(key)) storage.removeItem(key);
  }
}

function isDriveEncryptionKey(key: string): boolean {
  return key === LEGACY_GOOGLE_ENCRYPTION_KEY_WIF_KEY || key.startsWith(`${LEGACY_GOOGLE_ENCRYPTION_KEY_WIF_KEY}.`);
}

/**
 * Read the credential stored under `key`. When there is none, the shared legacy entry is moved
 * under `key` and returned if `isLegacyOwner` says it belongs to this account; otherwise it stays
 * for the account it belongs to, and null is returned.
 */
export function readCredential(
  storage: Storage,
  { key, legacyKey }: CredentialKey,
  isLegacyOwner: (legacyValue: string) => boolean
): string | null {
  const value = storage.getItem(key);
  if (value !== null) return value;
  const legacyValue = storage.getItem(legacyKey);
  if (legacyValue === null || !isLegacyOwner(legacyValue)) return null;
  storage.setItem(key, legacyValue);
  storage.removeItem(legacyKey);
  return legacyValue;
}

function storageKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key !== null) keys.push(key);
  }
  return keys;
}

/** Remove every credential stored for `username`: its WIF keys of every role, HiveAuth and Google Drive data. */
export function clearAccountCredentials(storage: Storage, username: string): void {
  const wifPrefix = wifCredentialKey(username, '');
  const accountKeys = new Set([
    hiveAuthCredentialKey(username).key,
    googleRefreshTokenCredentialKey(username).key,
    `${LEGACY_GOOGLE_ENCRYPTION_KEY_WIF_KEY}.${username}`
  ]);
  for (const key of storageKeys(storage)) {
    if (key.startsWith(wifPrefix) || accountKeys.has(key)) storage.removeItem(key);
  }
}

/** Remove the credentials of every account, and the legacy entries shared by all of them. */
export function clearAllCredentials(storage: Storage): void {
  for (const key of storageKeys(storage)) {
    const isCredential =
      key.startsWith(WIF_KEY_PREFIX) ||
      LEGACY_KEYS.some((legacyKey) => key === legacyKey || key.startsWith(`${legacyKey}.`));
    if (isCredential) storage.removeItem(key);
  }
}

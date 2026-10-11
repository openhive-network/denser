/**
 * Storage keys of the credentials signers keep for an account (stored WIF keys, HiveAuth tokens,
 * Google Drive tokens), so several signed-in accounts of one login method each keep their own.
 */

const WIF_KEY_PREFIX = 'wif.';
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

export function hiveAuthCredentialKey(username: string): CredentialKey {
  return { key: `${LEGACY_HIVEAUTH_KEY}.${username}`, legacyKey: LEGACY_HIVEAUTH_KEY };
}

export function googleRefreshTokenCredentialKey(username: string): CredentialKey {
  return { key: `${LEGACY_GOOGLE_REFRESH_TOKEN_KEY}.${username}`, legacyKey: LEGACY_GOOGLE_REFRESH_TOKEN_KEY };
}

export function googleEncryptionKeyWifCredentialKey(username: string): CredentialKey {
  return {
    key: `${LEGACY_GOOGLE_ENCRYPTION_KEY_WIF_KEY}.${username}`,
    legacyKey: LEGACY_GOOGLE_ENCRYPTION_KEY_WIF_KEY
  };
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
    googleEncryptionKeyWifCredentialKey(username).key
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

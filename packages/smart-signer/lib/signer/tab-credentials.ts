/**
 * Signing secrets kept in this page's memory, per account: WIF keys the user chose to remember for
 * the tab, and the Google Drive wallet's encryption key. Never written to browser storage, so they
 * survive client-side navigation but not a reload, and no other tab sees them.
 */

const wifKeys = new Map<string, string>();
const driveEncryptionKeys = new Map<string, string>();

const wifEntry = (username: string, keyType: string) => `${username}@${keyType}`;

/** Keep `wif` as `username`'s key of each of `keyTypes` for the life of the tab. */
export function rememberTabWif(username: string, keyTypes: readonly string[], wif: string): void {
  for (const keyType of keyTypes) wifKeys.set(wifEntry(username, keyType), wif);
}

/** The `keyType` WIF key remembered for `username` in this tab, or null. */
export function getTabWif(username: string, keyType: string): string | null {
  return wifKeys.get(wifEntry(username, keyType)) ?? null;
}

/**
 * The key types the WIF key remembered as `username`'s `keyType` key is remembered as, `keyType`
 * among them: more than one for an account using one key pair for several. None when none is kept.
 */
export function tabWifKeyTypes(username: string, keyType: string): string[] {
  const wif = getTabWif(username, keyType);
  if (wif === null) return [];
  const prefix = wifEntry(username, '');
  return [...wifKeys]
    .filter(([entry, value]) => entry.startsWith(prefix) && value === wif)
    .map(([entry]) => entry.slice(prefix.length));
}

export function rememberDriveEncryptionKey(username: string, encryptionKey: string): void {
  driveEncryptionKeys.set(username, encryptionKey);
}

export function getDriveEncryptionKey(username: string): string | null {
  return driveEncryptionKeys.get(username) ?? null;
}

export function forgetDriveEncryptionKey(username: string): void {
  driveEncryptionKeys.delete(username);
}

/** Forget the WIF keys of every role remembered for `username` in this tab. */
export function forgetTabWifKeys(username: string): void {
  const prefix = wifEntry(username, '');
  for (const entry of [...wifKeys.keys()]) {
    if (entry.startsWith(prefix)) wifKeys.delete(entry);
  }
}

/** Forget every secret kept for `username` in this tab. */
export function forgetTabCredentials(username: string): void {
  forgetTabWifKeys(username);
  driveEncryptionKeys.delete(username);
}

/** Forget the secrets of every account kept in this tab. */
export function forgetAllTabCredentials(): void {
  wifKeys.clear();
  driveEncryptionKeys.clear();
}

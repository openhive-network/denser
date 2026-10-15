import type { KeyAuthorityType } from '@hiveio/hb-auth';

/** Dispatched on `window` after a key was added to safe storage */
export const SAFE_STORAGE_KEYS_CHANGED_EVENT = 'safe-storage-keys-changed';

export function notifySafeStorageKeysChanged(): void {
  window.dispatchEvent(new Event(SAFE_STORAGE_KEYS_CHANGED_EVENT));
}

/** The key types safe storage holds for `username`; none when it does not know the account. */
export async function getSafeStorageKeyTypes(username: string): Promise<KeyAuthorityType[]> {
  // hb-auth's worker loads only for the sessions that use it
  const { hbauthService } = await import('@smart-signer/lib/hbauth-service');
  const authClient = await hbauthService.getOnlineClient();
  const auth = await authClient.getRegisteredUserByUsername(username);
  return auth?.registeredKeyTypes ?? [];
}

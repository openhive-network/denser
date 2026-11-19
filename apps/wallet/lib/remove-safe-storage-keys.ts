import type { KeyAuthorityType } from '@smart-signer/lib/utils';
import { notifySafeStorageKeysChanged } from '@smart-signer/lib/signer/safe-storage-keys';

const SAFE_STORAGE_KEY_TYPES: readonly string[] = ['posting', 'active'] satisfies KeyAuthorityType[];

/** Whether `role` is a key type this app keeps in safe storage */
export function isSafeStorageKeyType(role: string): role is KeyAuthorityType {
  return SAFE_STORAGE_KEY_TYPES.includes(role);
}

/** Removes `username`'s keys of `keyTypes` from safe storage in this browser. */
export async function removeSafeStorageKeys(username: string, keyTypes: readonly KeyAuthorityType[]): Promise<void> {
  if (!keyTypes.length) return;
  // hb-auth's worker loads only for the sessions that use it
  const { hbauthService } = await import('@smart-signer/lib/hbauth-service');
  await hbauthService.withOnlineClient(async (client) => {
    for (const keyType of keyTypes) await client.invalidateExistingKey(username, keyType);
  });
  notifySafeStorageKeysChanged();
}

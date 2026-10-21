'use client';

import type { LiteIdentity } from '@hiveio/lite-account';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { LITE_DID_PREFIX } from './lite-did';
import { LITE_IDENTITY_STORAGE_KEY } from './lite-storage';

/**
 * The browser's lite identity as stored, without loading the lite signing code (`useLiteIdentity`
 * does): for components on every page that only need to know which lite account this is.
 */
export function useStoredLiteIdentity(): LiteIdentity | null {
  const [identity] = useStorageWithTTL<LiteIdentity | null>(LITE_IDENTITY_STORAGE_KEY, null, StorageTTL.PERMANENT);
  return identity?.name ? identity : null;
}

/** Whether `did` is the browser's own lite account. */
export function useIsLiteIdentity(did: string): boolean {
  const identity = useStoredLiteIdentity();
  return !!identity && `${LITE_DID_PREFIX}${identity.name}` === did;
}

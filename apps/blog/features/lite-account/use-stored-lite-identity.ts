'use client';

import { useCallback, useMemo } from 'react';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { LITE_DID_PREFIX } from './lite-did';
import { readStoredLiteIdentity, type StoredLiteIdentity } from './lite-identity-record';
import { LITE_IDENTITY_STORAGE_KEY } from './lite-storage';

/**
 * The browser's lite identity as stored, without loading the lite signing code (`useLiteIdentity`
 * does): for components on every page that only need to know which lite account this is.
 */
export function useStoredLiteIdentity(): StoredLiteIdentity | null {
  const [raw] = useStorageWithTTL<unknown>(LITE_IDENTITY_STORAGE_KEY, null, StorageTTL.PERMANENT);
  return useMemo(() => readStoredLiteIdentity(raw), [raw]);
}

/**
 * The stored identity and a setter that replaces it, without the lite signing code: for the passkey
 * dialogs, which load the signing code only in the flow they run.
 */
export function useStoredLiteIdentityState(): [StoredLiteIdentity | null, (next: StoredLiteIdentity) => void] {
  const [raw, setRaw] = useStorageWithTTL<unknown>(LITE_IDENTITY_STORAGE_KEY, null, StorageTTL.PERMANENT);
  const identity = useMemo(() => readStoredLiteIdentity(raw), [raw]);
  const store = useCallback((next: StoredLiteIdentity) => setRaw(next), [setRaw]);
  return [identity, store];
}

/** Whether `did` is the browser's own lite account. */
export function useIsLiteIdentity(did: string): boolean {
  const identity = useStoredLiteIdentity();
  return !!identity && `${LITE_DID_PREFIX}${identity.name}` === did;
}

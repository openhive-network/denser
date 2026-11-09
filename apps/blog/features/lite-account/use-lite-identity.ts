'use client';

import { useCallback, useMemo } from 'react';
import { createLiteIdentity } from '@hiveio/lite-account';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { readStoredLiteIdentity, storedFromCreated, type StoredLiteIdentity } from './lite-identity-record';
import { LITE_CLIENT_ID_STORAGE_KEY, LITE_IDENTITY_STORAGE_KEY } from './lite-storage';

/**
 * The device-held lite identity (design doc §3): a key pair kept in origin-scoped storage. Until
 * it is secured with a passkey (`lite-secure-dialog`) this storage holds its only owner key; once
 * secured it holds a posting key only; moved to Safe Storage, no key. `identity` is the stored
 * record, which the lite flows sign for through its key store (`open-lite-key-store`).
 */
export function useLiteIdentity() {
  const [raw, setRaw, clear] = useStorageWithTTL<unknown>(LITE_IDENTITY_STORAGE_KEY, null, StorageTTL.PERMANENT);
  const [clientId, setClientId] = useStorageWithTTL<string>(LITE_CLIENT_ID_STORAGE_KEY, '', StorageTTL.PERMANENT);
  const identity = useMemo(() => readStoredLiteIdentity(raw), [raw]);

  const create = useCallback(
    (name: string): StoredLiteIdentity => {
      const created = storedFromCreated(createLiteIdentity(name));
      setRaw(created);
      return created;
    },
    [setRaw]
  );

  const store = useCallback((next: StoredLiteIdentity) => setRaw(next), [setRaw]);

  const markRegistered = useCallback(() => {
    setRaw((prev: unknown) => {
      const current = readStoredLiteIdentity(prev);
      return current ? { ...current, registered: true } : prev;
    });
  }, [setRaw]);

  const ensureClientId = useCallback((): string => {
    if (clientId) return clientId;
    const fresh = crypto.randomUUID();
    setClientId(fresh);
    return fresh;
  }, [clientId, setClientId]);

  return { identity, create, store, markRegistered, clear, ensureClientId };
}

'use client';

import { useCallback, useMemo } from 'react';
import { createLiteIdentity, type LiteIdentity } from '@hiveio/lite-account';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';
import { readStoredLiteIdentity, signingIdentity, storedFromCreated, type StoredLiteIdentity } from './lite-identity-record';
import { LITE_CLIENT_ID_STORAGE_KEY, LITE_IDENTITY_STORAGE_KEY } from './lite-storage';

/**
 * The device-held lite identity (design doc §3): a key pair kept in origin-scoped storage. Until
 * it is secured with a passkey (`lite-secure-dialog`) this storage holds its only owner key; once
 * secured it holds a posting key only. `identity` is what the post builders sign with.
 */
export function useLiteIdentity() {
  const [raw, setRaw, clear] = useStorageWithTTL<unknown>(LITE_IDENTITY_STORAGE_KEY, null, StorageTTL.PERMANENT);
  const [clientId, setClientId] = useStorageWithTTL<string>(LITE_CLIENT_ID_STORAGE_KEY, '', StorageTTL.PERMANENT);
  const stored = useMemo(() => readStoredLiteIdentity(raw), [raw]);
  const identity = useMemo(() => (stored ? signingIdentity(stored) : null), [stored]);

  const create = useCallback(
    (name: string): LiteIdentity => {
      const created = createLiteIdentity(name);
      setRaw(storedFromCreated(created));
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

  return { identity, stored, create, store, markRegistered, clear, ensureClientId };
}

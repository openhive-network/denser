'use client';

import { useCallback } from 'react';
import { createLiteIdentity, type LiteIdentity } from '@hive/lite-account';
import { useStorageWithTTL } from '@ui/hooks/useStorageWithTTL';
import { StorageTTL } from '@ui/lib/storage-with-ttl';

export const LITE_IDENTITY_STORAGE_KEY = 'lite-identity';
const LITE_CLIENT_ID_STORAGE_KEY = 'lite-client-id';

/**
 * The device-held lite identity (design doc §3): a throwaway-grade key pair kept in
 * origin-scoped storage. Cross-device durability comes later, via the "save this
 * identity" upgrade (passkey / social login), not from this storage.
 */
export function useLiteIdentity() {
  const [identity, setIdentity, clear] = useStorageWithTTL<LiteIdentity | null>(
    LITE_IDENTITY_STORAGE_KEY,
    null,
    StorageTTL.PERMANENT
  );
  const [clientId, setClientId] = useStorageWithTTL<string>(LITE_CLIENT_ID_STORAGE_KEY, '', StorageTTL.PERMANENT);

  const create = useCallback(
    (name: string): LiteIdentity => {
      const created = createLiteIdentity(name);
      setIdentity(created);
      return created;
    },
    [setIdentity]
  );

  const markRegistered = useCallback(() => {
    setIdentity((prev) => (prev ? { ...prev, registered: true } : prev));
  }, [setIdentity]);

  const ensureClientId = useCallback((): string => {
    if (clientId) return clientId;
    const fresh = crypto.randomUUID();
    setClientId(fresh);
    return fresh;
  }, [clientId, setClientId]);

  return { identity, create, markRegistered, clear, ensureClientId };
}

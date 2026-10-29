import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { LoginType, type User } from '@smart-signer/types/common';
import { getLoginAuthority, type LoginAuthority } from '@smart-signer/lib/auth/login-authority';
import { SAFE_STORAGE_KEYS_CHANGED_EVENT, getSafeStorageKeyTypes } from '@smart-signer/lib/signer/safe-storage-keys';
import { storedWifKeyTypes } from '@smart-signer/lib/signer/credential-storage';
import { subscribeSafeStorageGeneration } from '@hive/common-hiveio-packages/safe-storage-generation-subscription';

export interface StoredKeyTypes {
  /** The key types the session's signer holds keys of; undefined until read, and for other signers */
  keyTypes: readonly string[] | undefined;
  /** True while a safe-storage or WIF session's key types are being read */
  isPending: boolean;
}

async function readStoredKeyTypes({ loginType, username, keyType }: User): Promise<readonly string[]> {
  if (loginType === LoginType.hbauth) return getSafeStorageKeyTypes(username);
  return storedWifKeyTypes(window.localStorage, username, keyType);
}

/**
 * The key types `user`'s session holds keys of, kept up to date: those in safe storage for an
 * hbauth session, those its stored key is stored as for a wif session.
 */
export function useStoredKeyTypes(user: User): StoredKeyTypes {
  const { isLoggedIn, loginType, username, keyType } = user;
  const queryClient = useQueryClient();
  const enabled = isLoggedIn && (loginType === LoginType.hbauth || loginType === LoginType.wif);
  const query = useQuery({
    queryKey: [QUERY_KEY.safeStorageKeyTypes, loginType, username, keyType],
    queryFn: () => readStoredKeyTypes(user),
    enabled
  });

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY.safeStorageKeyTypes] });
    window.addEventListener(SAFE_STORAGE_KEYS_CHANGED_EVENT, refresh);
    // Another tab, of this app or another one on this origin, wrote a key to safe storage
    const unsubscribeOtherTabs = subscribeSafeStorageGeneration(refresh);
    return () => {
      window.removeEventListener(SAFE_STORAGE_KEYS_CHANGED_EVENT, refresh);
      unsubscribeOtherTabs();
    };
  }, [enabled, queryClient]);

  return { keyTypes: query.data, isPending: enabled && query.isPending };
}

/** What the session of `user` can sign with, counting the keys it added to safe storage or stored. */
export function useLoginAuthority(user: User): LoginAuthority {
  const { keyTypes } = useStoredKeyTypes(user);
  return getLoginAuthority(user, keyTypes);
}

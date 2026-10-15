import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { LoginType, type User } from '@smart-signer/types/common';
import { getLoginAuthority, type LoginAuthority } from '@smart-signer/lib/auth/login-authority';
import { SAFE_STORAGE_KEYS_CHANGED_EVENT, getSafeStorageKeyTypes } from '@smart-signer/lib/signer/safe-storage-keys';

export interface SafeStorageKeyTypes {
  /** The key types safe storage holds for the session's account; undefined until read, and for other signers */
  keyTypes: readonly string[] | undefined;
  /** True while an hbauth session's key types are being read */
  isPending: boolean;
}

/** The key types safe storage holds for the account of `user`'s hbauth session, kept up to date. */
export function useSafeStorageKeyTypes({ isLoggedIn, loginType, username, keyType }: User): SafeStorageKeyTypes {
  const queryClient = useQueryClient();
  const enabled = isLoggedIn && loginType === LoginType.hbauth;
  const query = useQuery({
    queryKey: [QUERY_KEY.safeStorageKeyTypes, username, keyType],
    queryFn: () => getSafeStorageKeyTypes(username),
    enabled
  });

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY.safeStorageKeyTypes] });
    window.addEventListener(SAFE_STORAGE_KEYS_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SAFE_STORAGE_KEYS_CHANGED_EVENT, refresh);
  }, [enabled, queryClient]);

  return { keyTypes: query.data, isPending: enabled && query.isPending };
}

/** What the session of `user` can sign with, counting the keys it added to safe storage. */
export function useLoginAuthority(user: User): LoginAuthority {
  const { keyTypes } = useSafeStorageKeyTypes(user);
  return getLoginAuthority(user, keyTypes);
}

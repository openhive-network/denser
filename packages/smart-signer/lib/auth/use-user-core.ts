import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import * as userLocalStorage from './user-localstore';
import { useLocalStorage } from 'usehooks-ts';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { defaultUser } from '@smart-signer/lib/auth/utils';
import { getLogger } from '@ui/lib/logging';
import { User } from '@smart-signer/types/common';

const logger = getLogger('app');

export interface IUseUser {
  user: User;
  /** True when user state from localStorage is stable (after hydration completes) */
  isHydrated: boolean;
}

export interface UseUserOptions {
  redirectTo?: string;
  redirectIfFound?: boolean;
}

async function getUser(): Promise<User> {
  return await fetchJson(`/api/users/me`);
}

/**
 * Core user hook logic shared between Pages Router and App Router versions.
 *
 * @param options - Configuration options
 * @param onRedirect - Callback to handle redirects (router-specific)
 * @param isMounted - Optional function to check if component is mounted (for App Router)
 * @returns User data and query state
 */
export function useUserCore(
  { redirectTo = '', redirectIfFound = false }: UseUserOptions = {},
  onRedirect: (path: string) => void,
  isMounted?: () => boolean
): IUseUser {
  const queryClient = useQueryClient();
  const [storedUser, storeUser] = useLocalStorage<User>('user', defaultUser);
  const { data: user } = useQuery<User>({
    queryKey: [QUERY_KEY.user],
    queryFn: async (): Promise<User> => getUser(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: storedUser,
    onError: () => {
      storeUser(defaultUser);
    }
  });

  useEffect(() => {
    userLocalStorage.saveUser(user || defaultUser);
  }, [user]);

  // Listen for auth storage desync events (IndexedDB cleared while session valid).
  // When detected, immediately transition to logged-out state in React Query cache.
  useEffect(() => {
    const handleDesync = () => {
      logger.warn('Auth storage desync event received — resetting user to logged-out state');
      queryClient.setQueryData([QUERY_KEY.user], defaultUser);
      storeUser(defaultUser);
    };
    window.addEventListener('auth-storage-desync', handleDesync);
    return () => window.removeEventListener('auth-storage-desync', handleDesync);
  }, [queryClient, storeUser]);

  useEffect(() => {
    // If no redirect needed, just return (example: already on
    // /dashboard). If user data not yet there (fetch in progress,
    // logged in or not) then don't do anything yet.
    if (!redirectTo || !user) {
      return;
    }

    if (
      // If redirectTo is set, redirect if the user was not found.
      (redirectTo && !redirectIfFound && !user?.isLoggedIn) ||
      // If redirectIfFound is also set, redirect if the user was found.
      (redirectIfFound && user?.isLoggedIn)
    ) {
      onRedirect(redirectTo);
    }
  }, [user, redirectIfFound, redirectTo, onRedirect]);

  // For App Router, check if mounted before returning user to prevent hydration mismatch
  // Server uses cookies, client uses localStorage - these may differ during hydration
  // Post-hydration invalidation in useUserClient ensures queries refetch with correct observer
  const resolvedUser = isMounted
    ? (!isMounted() || !user ? defaultUser : user)
    : (user ?? defaultUser);

  // Track hydration state - true when user state from localStorage is stable
  // This ensures queries wait for proper user state before fetching
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => {
    if (isMounted && isMounted()) {
      setIsHydrated(true);
    }
  }, [isMounted]);

  return {
    user: resolvedUser,
    isHydrated: isMounted ? isHydrated : true // For Pages Router (no isMounted), always hydrated
  };
}

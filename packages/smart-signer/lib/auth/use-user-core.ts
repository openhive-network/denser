import { useEffect, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import * as userLocalStorage from './user-localstore';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { defaultUser } from '@smart-signer/lib/auth/default-user';
import { getLogger } from '@ui/lib/logging';
import { useQueryErrorEffect } from '@ui/hooks/use-query-error-effect';
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

// Every hook instance would write the same user on mount; write it once per change.
let lastSavedUser: User | undefined;

function saveUserOnce(user: User): void {
  if (user === lastSavedUser) return;
  lastSavedUser = user;
  userLocalStorage.saveUser(user);
}

const subscribeToNothing = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * False while React hydrates server HTML (and on the server), true otherwise. A
 * component mounted after hydration reads true on its first render, so it renders
 * once, with the stored user, instead of rendering logged out and then again.
 */
function useIsPastHydration(): boolean {
  return useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot);
}

/**
 * Core user hook logic shared between Pages Router and App Router versions.
 *
 * @param options - Configuration options
 * @param onRedirect - Callback to handle redirects (router-specific)
 * @param waitForHydration - Report the logged-out user until hydration completes (App Router)
 * @returns User data and query state
 */
export function useUserCore(
  { redirectTo = '', redirectIfFound = false }: UseUserOptions = {},
  onRedirect: (path: string) => void,
  waitForHydration = false
): IUseUser {
  const queryClient = useQueryClient();
  const isPastHydration = useIsPastHydration();
  const userQuery = useQuery<User>({
    queryKey: [QUERY_KEY.user],
    queryFn: async (): Promise<User> => getUser(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Read once, when the query is created, not by every hook instance
    initialData: () => userLocalStorage.getUser()
  });
  const user = userQuery.data;
  useQueryErrorEffect(userQuery, () => saveUserOnce(defaultUser));

  useEffect(() => {
    saveUserOnce(user || defaultUser);
  }, [user]);

  // Listen for auth storage desync events (IndexedDB cleared while session valid).
  // When detected, immediately transition to logged-out state in React Query cache.
  useEffect(() => {
    const handleDesync = () => {
      logger.warn('Auth storage desync event received — resetting user to logged-out state');
      queryClient.setQueryData([QUERY_KEY.user], defaultUser);
      saveUserOnce(defaultUser);
    };
    window.addEventListener('auth-storage-desync', handleDesync);
    return () => window.removeEventListener('auth-storage-desync', handleDesync);
  }, [queryClient]);

  // Another tab logged out. Mark the user query stale without refetching: `/api/users/me` may
  // still answer with the session the other tab's logout request has not ended yet.
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!userLocalStorage.isLogoutStorageEvent(event)) return;
      if (!queryClient.getQueryData<User>([QUERY_KEY.user])?.isLoggedIn) return;
      queryClient.setQueryData([QUERY_KEY.user], defaultUser);
      saveUserOnce(defaultUser);
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.user], refetchType: 'none' });
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [queryClient]);

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

  // Server uses cookies, client uses localStorage - these may differ during hydration,
  // so hydration renders the logged-out user the server rendered
  const isHydrated = !waitForHydration || isPastHydration;
  const resolvedUser = isHydrated && user ? user : defaultUser;

  return {
    user: resolvedUser,
    isHydrated
  };
}

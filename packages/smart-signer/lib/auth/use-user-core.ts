import { useContext, useEffect, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import * as userLocalStorage from './user-localstore';
import { fetchJson } from '@smart-signer/lib/fetch-json';
import { defaultUser } from '@smart-signer/lib/auth/default-user';
import { getLogger } from '@ui/lib/logging';
import { appApiPath } from '@ui/lib/app-api-path';
import { useQueryErrorEffect } from '@ui/hooks/use-query-error-effect';
import { User } from '@smart-signer/types/common';
import { subscribeAccountsChanged } from '@smart-signer/lib/auth/account-sync';
import { followStoredAccounts } from '@smart-signer/lib/auth/active-user';
import { RequiredKeyTypeContext } from '@smart-signer/lib/auth/required-key-type';
import { lacksRequiredKeyType } from '@smart-signer/lib/auth/login-authority';
import { useSafeStorageKeyTypes } from '@smart-signer/lib/auth/use-login-authority';

const logger = getLogger('app');

export interface IUseUser {
  user: User;
  /** True when user state from localStorage is stable (after hydration completes) */
  isHydrated: boolean;
  /**
   * True when a session exists but cannot sign with the app's `RequiredKeyTypeContext` key;
   * `user` is then the logged-out user.
   */
  lacksRequiredKey: boolean;
  /** The session on this origin, also while `lacksRequiredKey` hides it from `user` */
  sessionUser: User;
}

export interface UseUserOptions {
  redirectTo?: string;
  redirectIfFound?: boolean;
}

async function getUser(): Promise<User> {
  return await fetchJson(appApiPath('/api/users/me'));
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
  const requiredKeyType = useContext(RequiredKeyTypeContext);
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
  const safeStorageKeys = useSafeStorageKeyTypes(user ?? defaultUser);
  // The stored session is kept as it is (another app on this origin may use it); only this app's view changes
  const lacksRequiredKey = !!user && lacksRequiredKeyType(user, requiredKeyType, safeStorageKeys.keyTypes);
  // Until safe storage says whether it holds the required key, the session is neither shown nor refused
  const isKeyCheckPending = lacksRequiredKey && safeStorageKeys.isPending;
  const appUser = lacksRequiredKey ? defaultUser : user;
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

  // Another tab switched or removed an account. Every hook instance hears it; following is idempotent
  useEffect(() => subscribeAccountsChanged(() => followStoredAccounts(queryClient)), [queryClient]);

  useEffect(() => {
    // If no redirect needed, just return (example: already on
    // /dashboard). If user data not yet there (fetch in progress,
    // logged in or not) then don't do anything yet.
    if (!redirectTo || !appUser) {
      return;
    }

    if (
      // If redirectTo is set, redirect if the user was not found.
      (redirectTo && !redirectIfFound && !appUser?.isLoggedIn) ||
      // If redirectIfFound is also set, redirect if the user was found.
      (redirectIfFound && appUser?.isLoggedIn)
    ) {
      onRedirect(redirectTo);
    }
  }, [appUser, redirectIfFound, redirectTo, onRedirect]);

  // Server uses cookies, client uses localStorage - these may differ during hydration,
  // so hydration renders the logged-out user the server rendered
  const isHydrated = (!waitForHydration || isPastHydration) && !isKeyCheckPending;
  const resolvedUser = isHydrated && appUser ? appUser : defaultUser;

  return {
    user: resolvedUser,
    isHydrated,
    lacksRequiredKey: isHydrated && lacksRequiredKey,
    sessionUser: user ?? defaultUser
  };
}

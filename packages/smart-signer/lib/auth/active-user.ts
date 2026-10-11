import type { QueryClient } from '@tanstack/react-query';
import { QUERY_KEY } from '@smart-signer/lib/query-keys';
import { User } from '@smart-signer/types/common';
import * as userLocalStorage from '@smart-signer/lib/auth/user-localstore';
import { observerListsApi } from '@transaction/lib/bridge-api';
import { ownListsQueryKey, refreshOwnLists } from '@transaction/lib/observer-lists';
import { replaceAccount } from '@smart-signer/lib/auth/accounts';

/** Store the remembered accounts where `useAccounts` reads them. */
export function setAccounts(queryClient: QueryClient, accounts: User[]): void {
  queryClient.setQueryData([QUERY_KEY.accounts], accounts);
  userLocalStorage.saveAccounts(accounts);
}

/** Make a signed-in `user` the one the app acts as, and refetch what depends on the observer. */
export function setActiveUser(queryClient: QueryClient, user: User): void {
  queryClient.setQueryData([QUERY_KEY.user], user);
  // Sync localStorage now so pages navigated to next get the right initial data
  userLocalStorage.saveUser(user);

  // Set observer cookie for SSR personalization
  if (user.username) {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `observer=${user.username}; path=/; SameSite=Lax${secure}`;
    // Decides whether feed and post reads may send the default observer instead
    queryClient.prefetchQuery({
      queryKey: ownListsQueryKey(user.username),
      queryFn: () => refreshOwnLists(user.username, observerListsApi)
    });
  }

  // Invalidate observer-dependent queries to refetch with new user context
  queryClient.invalidateQueries({ queryKey: ['communitiesList'] });
  queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });
}

/** Store a change to the current user's data (e.g. a consent) in its remembered account as well. */
export function updateActiveUser(queryClient: QueryClient, user: User): void {
  queryClient.setQueryData([QUERY_KEY.user], user);
  setAccounts(queryClient, replaceAccount(userLocalStorage.getAccounts(), user));
}

/** Follow the accounts, and the active one, another tab stored. */
export function followStoredAccounts(queryClient: QueryClient): void {
  queryClient.setQueryData([QUERY_KEY.accounts], userLocalStorage.getAccounts());
  const storedUser = userLocalStorage.getUser();
  const currentUser = queryClient.getQueryData<User>([QUERY_KEY.user]);
  if (storedUser.isLoggedIn && storedUser.username !== currentUser?.username) {
    setActiveUser(queryClient, storedUser);
  }
}

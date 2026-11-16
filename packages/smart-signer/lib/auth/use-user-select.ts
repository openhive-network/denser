import { useCallback, useSyncExternalStore } from 'react';
import { notifyManager, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { defaultUser } from '@smart-signer/lib/auth/default-user';
import { User } from '@smart-signer/types/common';
import { userQueryOptions } from './user-query';

// Builds the query from the stored user when no user hook has yet, as useQuery would.
function userQuery(queryClient: QueryClient) {
  return queryClient.getQueryCache().build(queryClient, userQueryOptions);
}

function readUser(queryClient: QueryClient): User {
  return userQuery(queryClient).state.data ?? defaultUser;
}

/**
 * `select` of the signed-in user, read as logged out while React hydrates server HTML, as
 * useUserClient's user is. The component re-renders only when the selected value changes
 * (compared with Object.is), so applying the stored user after hydration re-renders no reader whose
 * selection stays the same. `select` must return a primitive or a value it does not create.
 *
 * It only reads the user: saving it and following other tabs' sign-outs are left to the
 * useUserClient readers every page has (its header).
 */
export function useUserSelect<T>(select: (user: User) => T): T {
  const queryClient = useQueryClient();
  const subscribe = useCallback(
    (onChange: () => void) => {
      const { queryHash } = userQuery(queryClient);
      // Batched as useQuery's notifications are, so this and the useUserClient readers see a user
      // change in the same render (a sign-out does not reach a vote button before its page).
      const notify = notifyManager.batchCalls(onChange);
      return queryClient.getQueryCache().subscribe((event) => {
        if (event.query.queryHash === queryHash) notify();
      });
    },
    [queryClient]
  );
  return useSyncExternalStore(
    subscribe,
    () => select(readUser(queryClient)),
    () => select(defaultUser)
  );
}

/**
 * A function that reads the signed-in user when called, for event handlers: unlike useUserSelect,
 * the component does not re-render when the user changes.
 */
export function useUserReader(): () => User {
  const queryClient = useQueryClient();
  return useCallback(() => readUser(queryClient), [queryClient]);
}

export const selectIsLoggedIn = (user: User): boolean => user.isLoggedIn;
export const selectUsername = (user: User): string => user.username;

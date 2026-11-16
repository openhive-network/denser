import { useCallback, useSyncExternalStore } from 'react';
import { hashKey, notifyManager, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { defaultUser } from '@smart-signer/lib/auth/default-user';
import { User } from '@smart-signer/types/common';
import { userQueryOptions } from './user-query';

const USER_QUERY_HASH = hashKey(userQueryOptions.queryKey);

function readUser(queryClient: QueryClient): User {
  const query =
    queryClient.getQueryCache().get<User>(USER_QUERY_HASH) ??
    // Builds the query from the stored user when no user hook has yet, as useQuery would.
    queryClient.getQueryCache().build(queryClient, userQueryOptions);
  return query.state.data ?? defaultUser;
}

/** Subscribes a reader to user query changes; returns the unsubscribe function. */
type UserSubscribe = (onChange: () => void) => () => void;

const userSubscriptions = new WeakMap<QueryClient, UserSubscribe>();

/**
 * One query cache subscription per client, shared by every reader: the cache notifies its listeners
 * of every event of every query, so a subscription per reader would be called per comment for each.
 */
function userSubscribe(queryClient: QueryClient): UserSubscribe {
  const existing = userSubscriptions.get(queryClient);
  if (existing) return existing;
  const readers = new Set<() => void>();
  let unsubscribeCache: (() => void) | undefined;
  // Batched as useQuery's notifications are, so these and the useUserClient readers see a user
  // change in the same render (a sign-out does not reach a vote button before its page).
  const notify = notifyManager.batchCalls(() => readers.forEach((onChange) => onChange()));
  const subscribe: UserSubscribe = (onChange) => {
    readers.add(onChange);
    unsubscribeCache ??= queryClient.getQueryCache().subscribe((event) => {
      if (event.query.queryHash === USER_QUERY_HASH) notify();
    });
    return () => {
      readers.delete(onChange);
      if (readers.size === 0) {
        unsubscribeCache?.();
        unsubscribeCache = undefined;
      }
    };
  };
  userSubscriptions.set(queryClient, subscribe);
  return subscribe;
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
  return useSyncExternalStore(
    userSubscribe(queryClient),
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

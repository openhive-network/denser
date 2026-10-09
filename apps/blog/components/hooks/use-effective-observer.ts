import { useCallback, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { observerListsApi } from '@transaction/lib/bridge-api';
import {
  getEffectiveObserver,
  ownListsQueryKey,
  readOwnLists,
  refreshOwnLists,
  subscribeOwnLists
} from '@transaction/lib/observer-lists';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';

const readNothing = () => null;

/**
 * The client's observers: `observer` is the signed-in username (DEFAULT_OBSERVER when logged out),
 * for reads where the observer means more than mute and blacklist filtering (communities,
 * subscriptions, the `my` and `feed` lists). `effectiveObserver` is for feed, post, discussion and
 * search reads: DEFAULT_OBSERVER while the account is known to have no lists of its own.
 * An unknown or expired answer is checked through the API; until then both are the username.
 */
export function useEffectiveObserver(): { observer: string; effectiveObserver: string } {
  const { user } = useUserClient();
  const username = user.isLoggedIn ? user.username : '';
  const readStored = useCallback(() => (username ? readOwnLists(username) : null), [username]);
  const hasOwnLists = useSyncExternalStore(subscribeOwnLists, readStored, readNothing);

  useQuery({
    queryKey: ownListsQueryKey(username),
    queryFn: () => refreshOwnLists(username, observerListsApi),
    enabled: Boolean(username) && hasOwnLists === null,
    retry: false,
    refetchOnWindowFocus: false
  });

  return {
    observer: username || DEFAULT_OBSERVER,
    effectiveObserver: getEffectiveObserver(username, hasOwnLists)
  };
}

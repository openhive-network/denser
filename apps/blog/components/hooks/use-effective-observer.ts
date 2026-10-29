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
import { liteSocialApp } from '@transaction/lib/lite-api';
import { DEFAULT_OBSERVER } from '@/blog/lib/utils';
import { useLiteApiInfo } from '@/blog/features/lite-account/use-lite-api-info';
import { liteActorDid } from '@/blog/features/lite-account/lite-social-state';
import { useStoredLiteIdentity } from '@/blog/features/lite-account/use-stored-lite-identity';

const readNothing = () => null;

/**
 * The client's observers: `observer` is the signed-in username (DEFAULT_OBSERVER when logged out),
 * for reads where the observer means more than mute and blacklist filtering (communities,
 * subscriptions, the `my` and `feed` lists). `effectiveObserver` is for feed, post, discussion and
 * search reads: DEFAULT_OBSERVER while the account is known to have no lists of its own.
 * An unknown or expired answer is checked through the API; until then both are the username.
 * `liteObserver` is the DID of the browser's lite account for a reader who is not signed in, where
 * the node serves the lite social graph (its mutes apply to `lite.*` post reads), else null: only
 * post reads (`readPosts`) take it.
 */
export function useEffectiveObserver(): { observer: string; effectiveObserver: string; liteObserver: string | null } {
  const { user } = useUserClient();
  const username = user.isLoggedIn ? user.username : '';
  const readStored = useCallback(() => (username ? readOwnLists(username) : null), [username]);
  const hasOwnLists = useSyncExternalStore(subscribeOwnLists, readStored, readNothing);
  const liteIdentity = useStoredLiteIdentity();
  const liteSocial = liteSocialApp(useLiteApiInfo()) !== null;

  useQuery({
    queryKey: ownListsQueryKey(username),
    queryFn: () => refreshOwnLists(username, observerListsApi),
    enabled: Boolean(username) && hasOwnLists === null,
    retry: false,
    refetchOnWindowFocus: false
  });

  return {
    observer: username || DEFAULT_OBSERVER,
    effectiveObserver: getEffectiveObserver(username, hasOwnLists),
    liteObserver: !user.isLoggedIn && liteSocial && liteIdentity ? liteActorDid(liteIdentity.name) : null
  };
}

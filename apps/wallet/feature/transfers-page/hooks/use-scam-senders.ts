import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFollowList } from '@transaction/lib/bridge-api';
import badActorList from '@ui/config/lists/bad-actor-list';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';

const BAD_ACTORS: ReadonlySet<string> = new Set(badActorList);

/**
 * The accounts whose incoming transfers the history hides: the shared bad-actor list and, when
 * someone is logged in, the accounts they muted. Until the mute list loads (or if it fails to),
 * only the bad-actor list applies.
 */
export const useScamSenders = (): ReadonlySet<string> => {
  const { user } = useUserClient();
  const viewer = user.isLoggedIn ? user.username : '';
  const { data: muted } = useQuery({
    queryKey: ['muted', viewer],
    queryFn: () => getFollowList(viewer, 'muted'),
    enabled: Boolean(viewer)
  });

  return useMemo(
    () => (muted?.length ? new Set([...BAD_ACTORS, ...muted.map(({ name }) => name)]) : BAD_ACTORS),
    [muted]
  );
};

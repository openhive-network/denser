import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFollowList } from '@transaction/lib/bridge-api';
import badActorList from '@ui/config/lists/bad-actor-list';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import type { HiddenSenders } from '@/wallet/lib/scam-transfer-filter';

const BAD_ACTORS: ReadonlySet<string> = new Set(badActorList);
const NO_MUTED: ReadonlySet<string> = new Set();

/**
 * The accounts whose incoming transfers the history hides: the shared bad-actor list and, when
 * someone is logged in, the accounts they muted. Until the mute list loads (or if it fails to),
 * the muted set is empty.
 */
export const useHiddenSenders = (): HiddenSenders => {
  const { user } = useUserClient();
  const viewer = user.isLoggedIn ? user.username : '';
  const { data: muted } = useQuery({
    queryKey: ['muted', viewer],
    queryFn: () => getFollowList(viewer, 'muted'),
    enabled: Boolean(viewer)
  });

  return useMemo(
    () => ({
      badActors: BAD_ACTORS,
      muted: muted?.length ? new Set(muted.map(({ name }) => name)) : NO_MUTED
    }),
    [muted]
  );
};

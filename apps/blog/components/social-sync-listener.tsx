'use client';

import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { reloadOwnLists } from '@transaction/lib/observer-lists';
import { subscribeSocialChanged } from '@/blog/lib/social-sync';

const SOCIAL_LIST_QUERIES = ['followingData', 'muted', 'blacklisted', 'follow_blacklist', 'follow_muted'];

// The other tab reports a change once it is in a block; the API indexes it a little later.
const REFRESH_DELAYS = [0, 4000, 10000, 20000];

function refreshSocialLists(queryClient: QueryClient, username: string): void {
  reloadOwnLists();
  const refresh = () =>
    SOCIAL_LIST_QUERIES.forEach((list) => queryClient.invalidateQueries({ queryKey: [list, username] }));
  REFRESH_DELAYS.forEach((delay) => (delay > 0 ? setTimeout(refresh, delay) : refresh()));
}

/** Refreshes an account's follow, mute and blacklist lists when another tab changes them. */
export function SocialSyncListener() {
  const queryClient = useQueryClient();
  useEffect(
    () => subscribeSocialChanged((username) => refreshSocialLists(queryClient, username)),
    [queryClient]
  );
  return null;
}

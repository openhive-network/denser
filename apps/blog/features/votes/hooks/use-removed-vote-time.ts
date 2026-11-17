import { useQuery } from '@tanstack/react-query';
import type { Entry } from '@hive/common-hiveio-packages/wax';
import { getViewerVote } from '@transaction/lib/hive-api';
import { needsRemovedVoteTime } from '../lib/removed-votes';

/**
 * The chain time of the observer's removed vote on `entry`, read (one `list_votes` call, batched
 * with the page's other lookups) only when `needsRemovedVoteTime(entry)`. Undefined until it
 * answers, on a failed read, and for every other entry.
 */
export function useRemovedVoteTime(entry: Entry | null | undefined): string | undefined {
  const author = entry?.author ?? '';
  const permlink = entry?.permlink ?? '';
  const observer = entry?._observer ?? '';
  const { data } = useQuery({
    queryKey: ['removedVoteTime', author, permlink, observer],
    queryFn: async () => {
      const { votes } = await getViewerVote({ author, permlink, viewer: observer });
      return votes.find((vote) => vote.voter === observer)?.last_update ?? null;
    },
    enabled: Boolean(entry && observer && needsRemovedVoteTime(entry)),
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false
  });
  return data ?? undefined;
}

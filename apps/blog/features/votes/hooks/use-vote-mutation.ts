import { useRef } from 'react';
import { useMutation, QueryClient, useQueryClient } from '@tanstack/react-query';
import { TransactionBroadcastResult, transactionService } from '@transaction/index';
import { Entry } from '@hive/common-hiveio-packages/wax';
import { getListVotesByCommentVoter } from '@transaction/lib/hive-api';
import { getLogger } from '@ui/lib/logging';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';
import { scheduleInvalidations, scheduleValidatedRefetch } from '@/blog/lib/react-query';

const logger = getLogger('app');

type CacheSnapshot = { queryKey: readonly unknown[]; data: unknown };

/**
 * Optimistically update total_votes in postData, discussionData, and entriesInfinite caches.
 * Returns snapshots for rollback.
 */
function optimisticUpdateTotalVotes(
  queryClient: QueryClient,
  author: string,
  permlink: string,
  delta: number
): CacheSnapshot[] {
  if (delta === 0) return [];

  const snapshots: CacheSnapshot[] = [];

  // Update postData queries (single Entry objects)
  const postQueries = queryClient.getQueriesData<Entry>({ queryKey: ['postData', author, permlink] });
  for (const [key, data] of postQueries) {
    if (!data?.stats) continue;
    snapshots.push({ queryKey: key, data: structuredClone(data) });
    queryClient.setQueryData(key, {
      ...data,
      stats: { ...data.stats, total_votes: Math.max(0, data.stats.total_votes + delta) }
    });
  }

  // Update discussionData queries (record of entries keyed by path)
  const discussionQueries = queryClient.getQueriesData<Record<string, Entry>>({ queryKey: ['discussionData'] });
  for (const [key, data] of discussionQueries) {
    if (!data) continue;
    const entryKey = Object.keys(data).find((k) => {
      const entry = data[k];
      return entry?.author === author && entry?.permlink === permlink;
    });
    if (!entryKey || !data[entryKey]?.stats) continue;
    snapshots.push({ queryKey: key, data: structuredClone(data) });
    const entry = data[entryKey];
    queryClient.setQueryData(key, {
      ...data,
      [entryKey]: {
        ...entry,
        stats: { ...entry.stats, total_votes: Math.max(0, (entry.stats?.total_votes ?? 0) + delta) }
      }
    });
  }

  // Update entriesInfinite queries (paginated arrays of Entry objects)
  const infiniteQueries = queryClient.getQueriesData<{ pages: Entry[][]; pageParams: unknown[] }>({
    queryKey: ['entriesInfinite']
  });
  for (const [key, data] of infiniteQueries) {
    if (!data?.pages) continue;
    let found = false;
    const updatedPages = data.pages.map((page) =>
      page.map((entry) => {
        if (entry.author === author && entry.permlink === permlink && entry.stats) {
          found = true;
          return {
            ...entry,
            stats: { ...entry.stats, total_votes: Math.max(0, (entry.stats.total_votes ?? 0) + delta) }
          };
        }
        return entry;
      })
    );
    if (!found) continue;
    snapshots.push({ queryKey: key, data: structuredClone(data) });
    queryClient.setQueryData(key, { ...data, pages: updatedPages });
  }

  return snapshots;
}

/**
 * Makes vote transaction.
 * Uses optimistic UI - vote updates immediately after broadcast.
 *
 * @export
 * @return {*}
 */
export function useVoteMutation() {
  const queryClient = useQueryClient();
  const cleanupRef = useRef<(() => void) | null>(null);

  const voteMutation = useMutation({
    // Optimistic update BEFORE broadcast
    onMutate: async (params: { voter: string; author: string; permlink: string; weight: number }) => {
      const { voter, author, permlink, weight } = params;
      const queryKey = ['votes', author, permlink, voter];

      // Cancel previous validated refetch schedule (handles rapid re-votes)
      cleanupRef.current?.();
      cleanupRef.current = null;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous data for rollback
      const prevVoteData = queryClient.getQueryData(queryKey);

      // Optimistically update the vote data
      const newVoteData = {
        votes: [
          {
            author,
            id: 1,
            last_update: new Date().toISOString(),
            num_changes: 0,
            permlink,
            rshares: weight,
            vote_percent: weight,
            voter,
            weight
          }
        ]
      };
      queryClient.setQueryData(queryKey, newVoteData);

      // Determine vote count delta
      const hadPreviousVote = prevVoteData
        && Array.isArray((prevVoteData as { votes: unknown[] }).votes)
        && (prevVoteData as { votes: { vote_percent: number }[] }).votes.length > 0
        && (prevVoteData as { votes: { vote_percent: number }[] }).votes[0].vote_percent !== 0;
      const isNewVote = weight !== 0 && !hadPreviousVote;
      const isRemovingVote = weight === 0 && hadPreviousVote;
      const voteDelta = isNewVote ? 1 : isRemovingVote ? -1 : 0;

      // Optimistically update total_votes in postData and discussionData caches
      const prevCacheSnapshots = optimisticUpdateTotalVotes(queryClient, author, permlink, voteDelta);

      // Return context for rollback
      return { prevVoteData, queryKey, prevCacheSnapshots };
    },

    mutationFn: async (params: { voter: string; author: string; permlink: string; weight: number }) => {
      const { voter, author, permlink, weight } = params;
      // Use observe: false - don't wait for blockchain confirmation
      // A successful broadcast guarantees inclusion in the blockchain
      const broadcastResult: TransactionBroadcastResult = await transactionService.upVote(
        author,
        permlink,
        weight,
        { observe: false }
      );

      logger.info('Vote broadcast successful: %o', { voter, author, permlink, weight, broadcastResult });
      return { voter, author, permlink, weight, broadcastResult };
    },

    onSuccess: async (data) => {
      const { voter, author, permlink, weight } = data;
      toast({
        title: 'Vote successful',
        description:
          weight > 0
            ? 'You have successfully upvoted.'
            : weight < 0
              ? 'You have successfully downvoted.'
              : 'Your vote has been removed.',
        variant: 'success'
      });

      // Vote data has optimistic update - use validated refetch to avoid
      // overwriting optimistic data with stale API responses from Hivemind
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        ['votes', author, permlink, voter],
        () => getListVotesByCommentVoter([author, permlink, voter], 1),
        (freshData) => {
          const vote = freshData.votes?.[0];
          if (weight === 0) {
            return !vote || vote.voter !== voter || vote.vote_percent === 0;
          }
          return !!vote && vote.voter === voter && vote.vote_percent === weight;
        }
      );

      // Manabars don't have optimistic data from this mutation
      scheduleInvalidations(queryClient, [['manabars', voter]]);

      // entriesInfinite has optimistic total_votes — delayed invalidation for full data refresh
      scheduleInvalidations(queryClient, [['entriesInfinite']], [16000, 30000]);

      // Discussion and post data need longer delays since Hivemind takes
      // longer to reflect vote changes in aggregated data
      scheduleInvalidations(
        queryClient,
        [['postData', author, permlink], ['discussionData']],
        [16000, 30000]
      );
    },

    onError: (error: unknown, variables, context) => {
      // Rollback to previous data on error.
      // When prevVoteData is undefined (first vote attempt), set explicit empty
      // structure so the query data is cleared instead of left as optimistic.
      if (context?.queryKey) {
        queryClient.setQueryData(
          context.queryKey,
          context.prevVoteData ?? { votes: [] }
        );
      }
      // Rollback total_votes optimistic updates
      if (context?.prevCacheSnapshots) {
        for (const { queryKey: key, data } of context.prevCacheSnapshots) {
          queryClient.setQueryData(key, data);
        }
      }

      handleError(error, {
        method: 'useVoteMutation',
        params: variables
      });
    }
  });
  return voteMutation;
}

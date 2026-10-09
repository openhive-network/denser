import { useRef } from 'react';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { getListVotesByCommentVoter } from '@transaction/lib/hive-api';
import { useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { scheduleInvalidations, scheduleValidatedRefetch } from '@/blog/lib/react-query';
import { optimisticUpdateTotalVotes } from '../lib/optimistic-total-votes';

type VoteParams = { voter: string; author: string; permlink: string; weight: number };
type VoteData = { votes: { vote_percent: number }[] };

const hasActiveVote = (data: unknown): boolean => {
  const votes = (data as VoteData | undefined)?.votes;
  return Array.isArray(votes) && votes.length > 0 && votes[0].vote_percent !== 0;
};

const voteDescription = (weight: number) =>
  weight > 0
    ? 'You have successfully upvoted.'
    : weight < 0
      ? 'You have successfully downvoted.'
      : 'Your vote has been removed.';

/** Makes vote transaction; the vote shows in the cache before the broadcast. */
export function useVoteMutation() {
  const cleanupRef = useRef<(() => void) | null>(null);

  return useOperationMutation({
    name: 'useVoteMutation',
    optimistic: async ({ voter, author, permlink, weight }: VoteParams, queryClient) => {
      const queryKey = ['votes', author, permlink, voter];
      // Cancel previous validated refetch schedule (handles rapid re-votes)
      cleanupRef.current?.();
      cleanupRef.current = null;
      await queryClient.cancelQueries({ queryKey });
      const prevVoteData = queryClient.getQueryData(queryKey);
      const vote = {
        author,
        id: 1,
        last_update: new Date().toISOString(),
        num_changes: 0,
        permlink,
        rshares: weight,
        vote_percent: weight,
        voter,
        weight
      };
      queryClient.setQueryData(queryKey, { votes: [vote] });
      const hadPreviousVote = hasActiveVote(prevVoteData);
      const voteDelta = weight !== 0 && !hadPreviousVote ? 1 : weight === 0 && hadPreviousVote ? -1 : 0;
      const prevCacheSnapshots = optimisticUpdateTotalVotes(queryClient, author, permlink, voteDelta);
      return { prevVoteData, queryKey, prevCacheSnapshots };
    },
    // Not observed: a successful broadcast guarantees inclusion in the blockchain
    run: ({ author, permlink, weight }: VoteParams) =>
      transactionService.upVote(author, permlink, weight, { observe: false }),
    onSuccess: (_data, { voter, author, permlink, weight }, queryClient) => {
      // Validated refetch: a stale Hivemind response must not overwrite the optimistic vote
      cleanupRef.current = scheduleValidatedRefetch(
        queryClient,
        ['votes', author, permlink, voter],
        () => getListVotesByCommentVoter([author, permlink, voter], 1),
        (freshData) => {
          const vote = freshData.votes?.[0];
          if (weight === 0) return !vote || vote.voter !== voter || vote.vote_percent === 0;
          return !!vote && vote.voter === voter && vote.vote_percent === weight;
        }
      );
      scheduleInvalidations(queryClient, [['manabars', voter]]);
    },
    rollback: (context, _params, queryClient) => {
      if (!context) return;
      // No previous data (first vote): clear the optimistic vote rather than leave it
      queryClient.setQueryData(context.queryKey, context.prevVoteData ?? { votes: [] });
      for (const { queryKey, data } of context.prevCacheSnapshots) queryClient.setQueryData(queryKey, data);
    },
    successToast: (_data, { weight }) => ({ title: 'Vote successful', description: voteDescription(weight) }),
    // Hivemind takes longer to reflect votes in aggregated data; total_votes is optimistic meanwhile
    invalidate: ({ author, permlink }) => [
      ['entriesInfinite'],
      ['postData', author, permlink],
      ['discussionData']
    ],
    invalidateDelays: [16000, 30000]
  });
}

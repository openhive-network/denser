import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TransactionBroadcastResult, transactionService } from '@transaction/index';
import { getListVotesByCommentVoter } from '@transaction/lib/hive-api';
import { getLogger } from '@ui/lib/logging';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';
import { scheduleInvalidations, scheduleValidatedRefetch } from '@/blog/lib/react-query';

const logger = getLogger('app');

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

      // Return context for rollback
      return { prevVoteData, queryKey };
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
          const vote = freshData.votes[0];
          if (weight === 0) {
            return !vote || vote.voter !== voter || vote.vote_percent === 0;
          }
          return !!vote && vote.voter === voter && vote.vote_percent === weight;
        }
      );

      // These queries don't have optimistic data from this mutation
      scheduleInvalidations(queryClient, [['entriesInfinite'], ['manabars', voter]]);

      // Discussion and post data need longer delays since Hivemind takes
      // longer to reflect vote changes in aggregated data
      scheduleInvalidations(
        queryClient,
        [['postData', author, permlink], ['discussionData']],
        [16000, 30000]
      );
    },

    onError: (error: unknown, variables, context) => {
      // Rollback to previous data on error
      if (context?.prevVoteData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.prevVoteData);
      }

      handleError(error, {
        method: 'useVoteMutation',
        params: variables
      });
    }
  });
  return voteMutation;
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TransactionBroadcastResult, transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';

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
  const voteMutation = useMutation({
    // Optimistic update BEFORE broadcast
    onMutate: async (params: { voter: string; author: string; permlink: string; weight: number }) => {
      const { voter, author, permlink, weight } = params;
      const queryKey = ['votes', author, permlink, voter];

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

      // Invalidate after delay to fetch real data from Hivemind
      // Block time is ~3 seconds, but Hivemind indexing can take up to 8 seconds
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['discussionData'] });
        queryClient.invalidateQueries({ queryKey: [permlink, voter, 'ActiveVotes'] });
        queryClient.invalidateQueries({ queryKey: ['postData', author, permlink] });
        queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });
        queryClient.invalidateQueries({ queryKey: ['manabars', voter] });
        queryClient.invalidateQueries({ queryKey: ['votes', author, permlink, voter] });
      }, 8000);
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

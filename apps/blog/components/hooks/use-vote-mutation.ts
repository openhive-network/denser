import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TransactionBroadcastResult, transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { toast } from '@ui/components/hooks/use-toast';

const logger = getLogger('app');

/**
 * Makes vote transaction.
 *
 * See [TanStack Query
 * mutations](https://tanstack.com/query/v4/docs/framework/react/guides/mutations)
 *
 * @export
 * @return {*}
 */
export function useVoteMutation() {
  const queryClient = useQueryClient();
  const voteMutation = useMutation({
    mutationFn: async (params: { voter: string; author: string; permlink: string; weight: number }) => {
      const { voter, author, permlink, weight } = params;
      const broadcastResult: TransactionBroadcastResult = await transactionService.upVote(
        author,
        permlink,
        weight,
        {
          observe: true
        }
      );

      const response = { voter, author, permlink, weight, broadcastResult };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { voter, author, permlink, weight } = data;
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
            weight,
            _temporary: true
          }
        ]
      };
      queryClient.setQueryData(['votes', author, permlink, voter], newVoteData);
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
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['votes', author, permlink, voter] });
        queryClient.invalidateQueries({ queryKey: ['discussionData'] });
        queryClient.invalidateQueries({ queryKey: [permlink, voter, 'ActiveVotes'] });
        queryClient.invalidateQueries({ queryKey: ['postData', author, permlink] });
        queryClient.invalidateQueries({ queryKey: ['entriesInfinite'] });
        queryClient.invalidateQueries({ queryKey: ['manabars', voter] });
      }, 3000);
    }
  });
  return voteMutation;
}

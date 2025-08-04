import { useMutation, useQueryClient } from '@tanstack/react-query';
import { TransactionBroadcastResult, transactionService } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes reblog transaction.
 *
 * @export
 * @return {*}
 */
export function useReblogMutation() {
  const queryClient = useQueryClient();
  const reblogMutation = useMutation({
    mutationFn: async (params: { author: string; permlink: string; username: string }) => {
      const { author, permlink, username } = params;

      const broadcastResult: TransactionBroadcastResult = await transactionService.reblog(author, permlink, {
        observe: true
      });
      const response = { author, permlink, username, broadcastResult };
      return response;
    },
    onSettled: (data) => {
      if (!data) return;
      const { author, permlink, username } = data;
      queryClient.setQueriesData({ queryKey: ['PostRebloggedBy', author, permlink, username] }, true);
    },

    onSuccess: (data) => {
      const { author, permlink, username } = data;
      toast({
        title: 'Reblog successful',
        description: `You have successfully reblogged the post.`,
        variant: 'success'
      });
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['PostRebloggedBy', author, permlink, username] });
      }, 3000);
    }
  });

  return reblogMutation;
}

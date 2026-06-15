import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TransactionBroadcastResult } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';
import { handleError } from '@ui/lib/handle-error';

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

      // Lazy-load the transaction service (pulls @hiveio/wax + workerbee WASM) only
      // when the user actually reblogs, keeping it out of the feed's first-load bundle.
      const { transactionService } = await import('@transaction/index');
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
      }, 4000);
    },
    onError: (error: any, variables) => {
      handleError(error, {
        method: 'useReblogMutation',
        params: variables
      });
    }
  });

  return reblogMutation;
}

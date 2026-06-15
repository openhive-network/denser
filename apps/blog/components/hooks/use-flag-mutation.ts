import { useMutation } from '@tanstack/react-query';
import { toast } from '@ui/components/hooks/use-toast';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes flag transaction.
 *
 * @export
 * @return {*}
 */
export function useFlagMutation() {
  const flagMutation = useMutation({
    mutationFn: async (params: { community: string; username: string; permlink: string; notes: string }) => {
      const { community, username, permlink, notes } = params;
      // Lazy-load the transaction service (pulls @hiveio/wax + workerbee WASM) only when invoked.
      const { transactionService } = await import('@transaction/index');
      const broadcastResult = await transactionService.flag(community, username, permlink, notes, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done flag transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: 'Flag transaction successful',
        description: `You have flagged the post in ${data.community}.`,
        variant: 'success'
      });
      logger.info('useFlagMutation onSuccess data: %o', data);
    }
  });

  return flagMutation;
}

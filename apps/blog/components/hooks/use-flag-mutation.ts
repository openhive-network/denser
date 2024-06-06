import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
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
      const broadcastResult = await transactionService.flag(community, username, permlink, notes, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done flag transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useFlagMutation onSuccess data: %o', data);
    }
  });

  return flagMutation;
}

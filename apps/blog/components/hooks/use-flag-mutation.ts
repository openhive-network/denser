import { useMutation, useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const flagMutation = useMutation({
    mutationFn: async (params: { community: string; username: string; permlink: string; notes: string }) => {
      const { community, username, permlink, notes } = params;

      await transactionService.flag(community, username, permlink, notes);

      logger.info('Flagged: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useFlagMutation onSuccess data: %o', data);
      // Ivalidate queries
    }
  });

  return flagMutation;
}

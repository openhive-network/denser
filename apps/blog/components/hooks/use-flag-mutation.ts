import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

interface FlagParams {
  community: string;
  username: string;
  permlink: string;
  notes: string;
}

/**
 * Makes flag transaction.
 *
 * @export
 * @return {*}
 */
export function useFlagMutation() {
  const flagMutation = useMutation({
    mutationFn: async (params: FlagParams) => {
      const { community, username, permlink, notes } = params;

      await transactionService.flag(community, username, permlink, notes);

      logger.info('Flagged: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useFlagMutation onSuccess data: %o', data);
    }
  });

  const flag = async (params: FlagParams) => {
    try {
      await flagMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'flag' });
    }
  };

  return { flag, flagMutation };
}

import { future_extensions } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

/**
 * Makes update proposal votes transaction.
 *
 * @export
 * @return {*}
 */
export function useUpdateProposalVotesMutation() {
  const updateProposalVotesMutation = useMutation({
    mutationFn: async (params: {
      proposal_ids: string[];
      approve: boolean;
      extensions: future_extensions[];
    }) => {
      const { proposal_ids, approve, extensions } = params;
      const broadcastResult = await transactionService.updateProposalVotes(
        proposal_ids,
        approve,
        extensions,
        { observe: true }
      );
      const response = { ...params, broadcastResult };
      logger.info('Done update proposal votes transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useUpdateProposalVotesMutation onSuccess data: %o', data);
    }
  });

  return updateProposalVotesMutation;
}

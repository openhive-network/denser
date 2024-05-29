import { future_extensions } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { getLogger } from '@ui/lib/logging';
import { handleError } from '@ui/lib/utils';
const logger = getLogger('app');

interface UpdateProposalVotesParams {
  proposal_ids: string[];
  approve: boolean;
  extensions: future_extensions[];
}

/**
 * Makes update proposal votes transaction.
 *
 * @export
 * @return {*}
 */
export function useUpdateProposalVotesMutation() {
  const updateProposalVotesMutation = useMutation({
    mutationFn: async (params: UpdateProposalVotesParams) => {
      const { proposal_ids, approve, extensions } = params;

      await transactionService.updateProposalVotes(proposal_ids, approve, extensions);

      logger.info('Update proposal votes: %o', params);
      return params;
    },
    onSuccess: (data) => {
      logger.info('useUpdateProposalVotesMutation onSuccess data: %o', data);
    }
  });

  const updateProposalVotes = async (params: UpdateProposalVotesParams) => {
    try {
      await updateProposalVotesMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'updateProposalVotes', ...params });
    }
  };

  return { updateProposalVotes, updateProposalVotesMutation };
}

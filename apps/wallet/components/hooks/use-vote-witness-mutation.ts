import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';

/**
 * Makes witness vote transaction.
 *
 * @export
 * @returns
 */
export function useWitnessVoteMutation() {
  const witnessVoteMutation = useMutation({
    mutationFn: async (params: { account: string; witness: string; approve: boolean }) => {
      const { account, witness, approve } = params;
      const broadcastResult = await transactionService.witnessVote(account, witness, approve, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done witness vote transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useWitnessVote onSuccess data: %o', data);
    }
  });

  return witnessVoteMutation;
}

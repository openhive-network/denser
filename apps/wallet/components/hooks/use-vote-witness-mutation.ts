import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { toast } from '@ui/components/hooks/use-toast';
import { logger } from '@ui/lib/logger';

/**
 * Makes witness vote transaction.
 *
 * @export
 * @returns
 */
export function useWitnessVoteMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();

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
      const { approve, witness } = data;
      logger.info('useWitnessVote onSuccess data: %o', data);
      queryClient.invalidateQueries({
        queryKey: ['listWitnessVotesData']
      });
      queryClient.invalidateQueries({
        queryKey: ['accountData', user.username]
      });
      queryClient.invalidateQueries({
        queryKey: ['witnesses']
      });
      toast({
        variant: 'success',
        description: approve
          ? `You have voted for witness ${witness}`
          : `You have removed vote for witness ${witness}`
      });
    }
  });

  return witnessVoteMutation;
}

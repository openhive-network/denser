import { useUser } from '@smart-signer/lib/auth/use-user';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';

export function useCancelTransferFromSavingsMutation() {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const cancelTransferFromSavingsMutation = useMutation({
    mutationFn: async (params: { fromAccount: string; requestId: number }) => {
      const broadcastResult = await transactionService.cancelTransferFromSavings(
        params.fromAccount,
        params.requestId,
        {
          observe: true
        }
      );

      const response = { ...params, broadcastResult };

      logger.info('Done cancel transfer from savings transaction: %o', response);
    },
    onSuccess: (data) => {
      logger.info('useCancelTransferFromSavingsMutation onSuccess data: %o', data);
      const { username } = user;
      queryClient.invalidateQueries({ queryKey: ['savingsWithdrawalsFrom', username] });
    }
  });

  return cancelTransferFromSavingsMutation;
}

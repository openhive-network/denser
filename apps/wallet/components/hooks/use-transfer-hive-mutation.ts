import { getSavingsWithdrawals } from '@/wallet/lib/hive';
import { asset } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';

/**
 * Makes transfer transaction.
 *
 * @export
 * @returns
 */
export function useTransferHiveMutation() {
  const transferMutation = useMutation({
    mutationFn: async (params: { fromAccount: string; toAccount: string; memo: string; amount: asset }) => {
      const { amount, fromAccount, memo, toAccount } = params;
      const broadcastResult = await transactionService.transfer(amount, fromAccount, memo, toAccount, {
        observe: true
      });
      const response = { ...params, broadcastResult };
      logger.info('Done transfer transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useTransferHive onSuccess data: %o', data);
    }
  });

  return transferMutation;
}

/**
 * Makes transfer to savings transaction.
 *
 * @export
 * @returns
 */
export function useTransferToSavingsMutation() {
  const transferToSavingsMutation = useMutation({
    mutationFn: async (params: { fromAccount: string; toAccount: string; memo: string; amount: asset }) => {
      const { amount, fromAccount, memo, toAccount } = params;
      const broadcastResult = await transactionService.transferToSavings(
        amount,
        fromAccount,
        memo,
        toAccount,
        { observe: true }
      );
      const response = { ...params, broadcastResult };
      logger.info('Done transfer to savings transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useTransferToSavings onSuccess data: %o', data);
    }
  });

  return transferToSavingsMutation;
}

/**
 * Makes transfer from savings transaction
 *
 * @export
 * @returns
 */
export function useWithdrawFromSavingsMutation() {
  const withdrawFromSavingsMutation = useMutation({
    mutationFn: async (params: { fromAccount: string; toAccount: string; memo: string; amount: asset }) => {
      const { amount, fromAccount, memo, toAccount } = params;
      const pendingWithdrawals = (await getSavingsWithdrawals(fromAccount)).withdrawals;
      let requestId = 0;
      
      if (!!pendingWithdrawals.length) {
        requestId = Math.max(...pendingWithdrawals.map((withdrawal) => withdrawal.request_id)) + 1;
      }

      const broadcastResult = await transactionService.transferFromSavings(
        amount,
        fromAccount,
        memo,
        toAccount,
        requestId,
        { observe: true }
      );
      const response = { ...params, broadcastResult };
      logger.info('Done transfer from savings transaction: %o', response);
      return response;
    },
    onSuccess: (data) => {
      logger.info('useWithdrawFromSavingsMutation onSuccess data: %o', data);
    }
  });

  return withdrawFromSavingsMutation;
}

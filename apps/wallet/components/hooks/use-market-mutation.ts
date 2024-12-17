import { asset } from '@hiveio/wax';
import { useMutation } from '@tanstack/react-query';
import { transactionService } from '@transaction/index';
import { logger } from '@ui/lib/logger';

export function useCreateMarketOrder() {
  const createMarketOrderMutation = useMutation({
    mutationFn: async (params: {
      amountToSell: asset;
      owner: string;
      minToReceive: asset;
      orderId: number;
      fillOrKill: boolean;
      expiration: string;
    }) => {
      const { amountToSell, owner, minToReceive, orderId, fillOrKill, expiration } = params;

      const broadcastResult = await transactionService.limitOrderCreate(
        amountToSell,
        owner,
        minToReceive,
        orderId,
        fillOrKill,
        expiration
      );
      const response = { ...params, broadcastResult };
      logger.info('Done create market order: %o', response);
    },
    onSuccess: (data) => {
      logger.info('useCreateMarketOrder onSuccess data: %o', data);
    }
  });

  return createMarketOrderMutation;
}

export function useCancelMarketOrder() {
  const cancelMarketOrderMutation = useMutation({
    mutationFn: async (params: { owner: string; orderId: number }) => {
      const { owner, orderId } = params;

      const broadcastResult = await transactionService.limitOrderCancel(owner, orderId, { observe: true });
      const response = { ...params, broadcastResult };
      logger.info('Done cancel market order: %o', response);
    },
    onSuccess: (data) => {
      logger.info('useCancelMarketOrder onSuccess data: %o', data);
    }
  });

  return cancelMarketOrderMutation;
}

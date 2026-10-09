import { asset } from '@hiveio/wax';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';

type CreateOrderParams = {
  amountToSell: asset;
  owner: string;
  minToReceive: asset;
  orderId: number;
  fillOrKill: boolean;
  expiration: string;
};

export const useCreateMarketOrder = () =>
  useOperationMutation({
    name: 'useCreateMarketOrder',
    run: ({ amountToSell, owner, minToReceive, orderId, fillOrKill, expiration }: CreateOrderParams) =>
      transactionService.limitOrderCreate(
        amountToSell,
        owner,
        minToReceive,
        orderId,
        fillOrKill,
        expiration,
        OBSERVE
      ),
    reportErrors: false
  });

export const useCancelMarketOrder = () =>
  useOperationMutation({
    name: 'useCancelMarketOrder',
    run: ({ owner, orderId }: { owner: string; orderId: number }) =>
      transactionService.limitOrderCancel(owner, orderId, OBSERVE),
    reportErrors: false
  });

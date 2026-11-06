import { asset } from '@hiveio/wax';
import { transactionService } from '@transaction/lib/lazy-transaction-service';
import { OBSERVE, useOperationMutation } from '@ui/components/hooks/use-operation-mutation';
import { formatNaiAsset, isHive } from '@ui/lib/helpers';
import { useTranslation } from '@/wallet/i18n/client';

const OPEN_ORDERS_REFRESH_DELAYS = [0, 4000, 10000, 20000];

type CreateOrderParams = {
  amountToSell: asset;
  owner: string;
  minToReceive: asset;
  orderId: number;
  fillOrKill: boolean;
  expiration: string;
};

export const useCreateMarketOrder = () => {
  const { t } = useTranslation('common_wallet');
  return useOperationMutation({
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
    successToast: (_data, { amountToSell, minToReceive }) => {
      const isSell = isHive(amountToSell);
      const [hive, hbd] = (isSell ? [amountToSell, minToReceive] : [minToReceive, amountToSell]).map((amount) =>
        formatNaiAsset(amount)
      );
      return {
        title: t('market_page.order_placed'),
        description: isSell
          ? t('market_page.order_placed_sell', { hive, hbd })
          : t('market_page.order_placed_buy', { hive, hbd })
      };
    },
    reportErrors: false
  });
};

export const useCancelMarketOrder = () => {
  const { t } = useTranslation('common_wallet');
  return useOperationMutation({
    name: 'useCancelMarketOrder',
    run: ({ owner, orderId }: { owner: string; orderId: number }) =>
      transactionService.limitOrderCancel(owner, orderId, OBSERVE),
    successToast: (_data, { orderId }) => ({
      title: t('market_page.order_cancelled'),
      description: t('market_page.order_cancelled_description', { orderId })
    }),
    // The API node lists the order for a while after the block that cancelled it
    invalidate: ({ owner }) => [['openOrders', owner]],
    invalidateDelays: OPEN_ORDERS_REFRESH_DELAYS,
    reportErrors: false
  });
};

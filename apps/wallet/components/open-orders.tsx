'use client';

import clsx from 'clsx';
import { IOpenOrdersData } from '@hive/common-hiveio-packages/wax';
import { useTranslation } from '@/wallet/i18n/client';
import { Button, Dialog, DialogContent, DialogFooter, DialogTrigger } from '@ui/components';
import { dateToFormatted } from '@ui/lib/parse-date';
import { useState } from 'react';
import Loading from '@ui/components/loading';
import { Icons } from '@ui/components/icons';
import { useCancelMarketOrder } from './hooks/use-market-mutation';
import { handleError } from '@ui/lib/handle-error';
import { convertStringToBig, isHive } from '@ui/lib/helpers';

interface OpenOrderProps {
  user: string;
  orders?: IOpenOrdersData[];
  loading: boolean;
}

/**
 * Cancels `user`'s orders. An order is cancelling from the confirmation until the list no longer has
 * it, which may be several seconds after the broadcast, so it cannot be cancelled twice meanwhile;
 * a failed cancel makes it cancellable again.
 */
function useOrderCancel(user: string) {
  const cancelOrderMutation = useCancelMarketOrder();
  const [cancellingIds, setCancellingIds] = useState<ReadonlySet<number>>(() => new Set());

  const cancelOrder = async (orderId: number) => {
    setCancellingIds((prev) => new Set(prev).add(orderId));
    const params = { owner: user, orderId };
    try {
      await cancelOrderMutation.mutateAsync(params);
    } catch (error) {
      setCancellingIds((prev) => new Set([...prev].filter((id) => id !== orderId)));
      handleError(error, { method: 'limit_order_cancel', params });
    }
  };

  return { cancelOrder, isCancelling: (orderId: number) => cancellingIds.has(orderId) };
}

const OpenOrders: React.FC<OpenOrderProps> = ({ user, orders, loading }) => {
  const { t } = useTranslation('common_wallet');
  const [sortAsc, setSortAsc] = useState(true);
  const { cancelOrder, isCancelling } = useOrderCancel(user);

  return (
    <div className={clsx('mt-4 flex h-[342px] w-full flex-col justify-between')}>
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl ">{t('market_page.open_orders')}</h2>
        <table className="table-auto text-end text-xs">
          <thead>
            <tr className="bg-background-secondary">
              <th align="left">
                <Button
                  variant="ghost"
                  className="h-fit py-0 hover:bg-transparent"
                  onClick={() => setSortAsc(!sortAsc)}
                >
                  <span>{t('market_page.date_created')}</span>
                  <span className="ml-4 text-xl leading-none">{sortAsc ? '▴' : '▾'}</span>
                </Button>
              </th>
              <th>{t('market_page.type')}</th>
              <th>{t('market_page.price')}</th>
              <th>HIVE</th>
              <th>HBD ($)</th>
              <th>{t('market_page.filled')}</th>
              <th className="px-4">{t('market_page.action')}</th>
            </tr>
          </thead>
          {loading ? (
            <tr>
              <td colSpan={7}>
                <Loading loading className="pt-8" />
              </td>
            </tr>
          ) : (
            <tbody>
              {orders && orders.length ? (
                (sortAsc ? orders : orders.toReversed()).map((order: IOpenOrdersData) => {
                  const baseAmount = convertStringToBig(order.sell_price.base);
                  const quoteAmount = convertStringToBig(order.sell_price.quote);
                  const isSellOrder = isHive(order.sell_price.base);
                  const realPrice = isSellOrder
                    ? quoteAmount.div(baseAmount)
                    : baseAmount.div(quoteAmount);
                  const hiveAmount = isSellOrder ? baseAmount : quoteAmount;
                  const hbdAmount = isSellOrder ? quoteAmount : baseAmount;

                  return (
                    <tr className="even:bg-background-tertiary" key={order.orderid}>
                      <td align="left" className="pl-4">
                        {dateToFormatted(order.created, 'YYYY-MM-DD HH:mm:ss')}
                      </td>
                      <td>
                        {isSellOrder ? t('market_page.sell') : t('market_page.buy')}
                      </td>
                      <td>{realPrice.toFixed(6)}</td>
                      <td>{hiveAmount.toFixed(3)}</td>
                      <td>{hbdAmount.toFixed(3)}</td>
                      <td>
                        {(
                          (1 - order.for_sale / 1000 / baseAmount.toNumber()) *
                          100
                        ).toFixed(2)}
                        %
                      </td>
                      <td>
                        {isCancelling(order.orderid) ? (
                          <Button
                            variant="ghost"
                            className="h-fit py-0 text-destructive hover:bg-transparent"
                            disabled
                            data-testid="open-order-cancelling"
                          >
                            <Icons.spinner className="mr-1 h-3 w-3 animate-spin" />
                            {t('market_page.cancelling')}
                          </Button>
                        ) : (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                className="h-fit py-0 text-destructive hover:bg-transparent"
                                onClick={() => null}
                              >
                                {t('market_page.cancel')}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="text-left sm:max-w-[425px]">
                              {t('market_page.confirm_cancel_order', {
                                orderId: order.orderid,
                                user: order.seller
                              })}
                              <DialogFooter className="flex flex-row items-start gap-4 sm:flex-row-reverse sm:justify-start">
                                <DialogTrigger asChild>
                                  <Button variant="redHover" onClick={() => cancelOrder(order.orderid)}>
                                    {t('market_page.cancel_order')}
                                  </Button>
                                </DialogTrigger>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-2 text-center">
                    {t('market_page.no_orders')}
                  </td>
                </tr>
              )}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
};

export default OpenOrders;

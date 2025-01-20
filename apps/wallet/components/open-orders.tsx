import clsx from 'clsx';
import { IOpenOrdersData } from '../lib/hive';
import { useTranslation } from 'next-i18next';
import { Button, Dialog, DialogContent, DialogFooter, DialogTrigger } from '@ui/components';
import { dateToFormatted } from '@ui/lib/parse-date';
import { useState } from 'react';
import Loading from '@ui/components/loading';
import { useCancelMarketOrder } from './hooks/use-market-mutation';
import { handleError } from '@ui/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

interface OpenOrderProps {
  user: string;
  orders?: IOpenOrdersData[];
  loading: boolean;
}

const OpenOrders: React.FC<OpenOrderProps> = ({ user, orders, loading }) => {
  const { t } = useTranslation('common_wallet');
  const [sortAsc, setSortAsc] = useState(true);
  const cancelOrderMutation = useCancelMarketOrder();
  const queryClient = useQueryClient();

  const cancelOrder = async (orderId: number) => {
    const params = { owner: user, orderId };
    try {
      await cancelOrderMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'limit_order_cancel', params });
    } finally {
      queryClient.invalidateQueries({ queryKey: ['openOrders', user] });
    }
  };

  return (
    <div className={clsx('mt-4 flex h-[342px] w-full flex-col justify-between')}>
      <div className="flex flex-col gap-2">
        <div className="text-2xl ">{t('market_page.open_orders')}</div>
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
                  const currency = [
                    order.sell_price.base.split(' ')[0],
                    order.sell_price.quote.split(' ')[0]
                  ];
                  if (order.sell_price.base.includes('HBD')) currency.reverse();

                  return (
                    <tr className="even:bg-background-tertiary" key={order.orderid}>
                      <td align="left" className="pl-4">
                        {dateToFormatted(order.created, 'YYYY-MM-DD HH:mm:ss')}
                      </td>
                      <td>
                        {order.sell_price.base.includes('HIVE')
                          ? t('market_page.sell')
                          : t('market_page.buy')}
                      </td>
                      <td>{Number(order.real_price).toFixed(6)}</td>
                      <td>{currency[0]}</td>
                      <td>{currency[1]}</td>
                      <td>
                        {(
                          (1 - order.for_sale / 1000 / parseFloat(order.sell_price.base.split(' ')[0])) *
                          100
                        ).toFixed(2)}
                        %
                      </td>
                      <td>
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

'use client';

import { useCallback, useEffect, useId, useReducer, useState } from 'react';
import { Button } from '@ui/components/button';
import clsx from 'clsx';
import { convertStringToBig, formatNaiAsset } from '@ui/lib/helpers';
import { useTranslation } from '@/wallet/i18n/client';
import { useCreateMarketOrder } from './hooks/use-market-mutation';
import { handleError } from '@ui/lib/handle-error';
import { useUserClient } from '@smart-signer/lib/auth/use-user-client';
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from '@ui/components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAccount } from '@transaction/lib/hive-api';
import { getAsset } from '@transaction/lib/utils';
import { exceedsAvailableBalance, orderFormReducer } from '../lib/market-order-form';
import OrderFormField from './order-form-field';

export default function BuyOrSellForm({
  price,
  defaultPrice,
  transaction
}: {
  price: string;
  defaultPrice: string;
  transaction: 'sell' | 'buy';
}) {
  const { t } = useTranslation('common_wallet');
  const [state, dispatch] = useReducer(orderFormReducer, {
    price,
    amount: '',
    total: ''
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useUserClient();
  const createBuyOrderMutation = useCreateMarketOrder();
  const { data: accountData } = useQuery({
    queryKey: ['accountData', user.username],
    queryFn: () => getAccount(user.username),
    enabled: !!user.username
  });
  const queryClient = useQueryClient();
  const testIdPrefix = transaction === 'buy' ? 'buy-form' : 'sell-form';
  const headingId = useId();
  const errorId = useId();

  useEffect(() => {
    dispatch({ type: 'price', value: price });
  }, [price]);

  const submitOrder = useCallback(async () => {
    const DEFAULT_EXPIRE = new Date(Math.floor(Date.now() / 1000 + 60 * 60 * 24 * 27) * 1000)
      .toISOString()
      .split('.')[0];
    const hbd = await getAsset(state.total, 'HBD');
    const hive = await getAsset(state.amount, 'HIVE');
    const params = {
      owner: user.username,
      amountToSell: transaction === 'buy' ? hbd : hive,
      minToReceive: transaction === 'buy' ? hive : hbd,
      orderId: Math.floor(Date.now() / 1000),
      fillOrKill: false,
      expiration: DEFAULT_EXPIRE
    };

    try {
      await createBuyOrderMutation.mutateAsync(params);
    } catch (error) {
      handleError(error, { method: 'limit_order_create', params });
    } finally {
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['openOrders', user.username] });
    }
  }, [createBuyOrderMutation, queryClient, state.amount, state.total, transaction, user.username]);

  const availableAsset = transaction === 'buy' ? accountData?.hbd_balance : accountData?.balance;
  const availableText = availableAsset ? formatNaiAsset(availableAsset) : '';
  const insufficientBalance = exceedsAvailableBalance(
    state,
    transaction,
    availableAsset ? convertStringToBig(availableAsset) : undefined
  );
  const canSubmit = Boolean(state.amount && state.total) && !insufficientBalance;
  const balanceErrorId = insufficientBalance ? errorId : undefined;
  const setDefaultPrice = () => dispatch({ type: 'price', value: defaultPrice });
  const label = transaction === 'sell' ? t('market_page.sell_hive') : t('market_page.buy_hive');
  return (
    <div className="flex w-full flex-col gap-8" data-testid={`${testIdPrefix}-section`}>
      <h2
        id={headingId}
        className={clsx('sm:text-xl', {
          'text-destructive': transaction === 'sell',
          'text-green-600': transaction === 'buy'
        })}
        data-testid={`${testIdPrefix}-label`}
      >
        {label}
      </h2>
      <div className="flex flex-col gap-4">
        <OrderFormField
          headingId={headingId}
          label={t('market_page.price')}
          unit="HBD/HIVE"
          value={state.price}
          onChange={(value) => dispatch({ type: 'price', value })}
          testId={`${testIdPrefix}-price`}
        />
        <OrderFormField
          headingId={headingId}
          label={t('market_page.amount')}
          unit="HIVE"
          value={state.amount}
          onChange={(value) => dispatch({ type: 'amount', value })}
          testId={`${testIdPrefix}-amount`}
          errorId={transaction === 'sell' ? balanceErrorId : undefined}
        />
        <OrderFormField
          headingId={headingId}
          label={t('market_page.total')}
          unit="HBD ($)"
          value={state.total}
          onChange={(value) => dispatch({ type: 'total', value })}
          testId={`${testIdPrefix}-total`}
          errorId={transaction === 'buy' ? balanceErrorId : undefined}
        />
        {insufficientBalance ? (
          <p
            id={errorId}
            role="alert"
            className="text-end text-xs text-destructive"
            data-testid={`${testIdPrefix}-balance-error`}
          >
            {t('market_page.insufficient_balance', { available: availableText })}
          </p>
        ) : null}
      </div>
      <div className="flex justify-between">
        <div className="text-xs" data-testid={`${testIdPrefix}-info`}>
          <div data-testid={`${testIdPrefix}-available`}>
            <span className="cursor-pointer text-destructive" onClick={setDefaultPrice}>
              {t('market_page.available')}:{' '}
            </span>
            <span data-testid={`${testIdPrefix}-available-value`}>{availableText}</span>
          </div>
          <div data-testid={`${testIdPrefix}-default-price`}>
            <span className="cursor-pointer text-destructive" onClick={setDefaultPrice}>
              {transaction === 'sell' ? t('market_page.highest_bid') : t('market_page.lowest_ask')}:{' '}
            </span>
            <span data-testid={`${testIdPrefix}-default-price-value`}>{defaultPrice}</span>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={!canSubmit}
              aria-describedby={balanceErrorId}
              variant="outline"
              data-testid={`${testIdPrefix}-submit-button`}
              className={clsx({
                'border-destructive bg-background-secondary text-destructive hover:bg-red-950 hover:text-red-400':
                  transaction === 'sell',
                'border-card-empty-border border-2 border-solid bg-card-noContent text-green-500 hover:bg-green-50 hover:text-green-600':
                  transaction === 'buy'
              })}
            >
              {label}
            </Button>
          </DialogTrigger>
          <DialogContent data-testid={`${testIdPrefix}-dialog`}>
            {t('market_page.buy_sell_prompt', {
              operation: transaction === 'buy' ? t('market_page.buy') : t('market_page.sell'),
              hive: state.amount,
              hbd: state.total,
              rate: `${state.price}/HIVE`
            })}
            <DialogFooter className="flex w-full items-center !justify-between">
              <Button onClick={submitOrder} data-testid={`${testIdPrefix}-dialog-ok`}>{t('market_page.ok')}</Button>
              <Button variant="secondary" onClick={() => setDialogOpen(false)} data-testid={`${testIdPrefix}-dialog-close`}>
                {t('market_page.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

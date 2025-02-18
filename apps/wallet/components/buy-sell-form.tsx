import { useCallback, useEffect, useReducer, useState } from 'react';
import { Input } from '@ui/components/input';
import { Button } from '@ui/components/button';
import clsx from 'clsx';
import { convertStringToBig } from '@ui/lib/helpers';
import { useTranslation } from 'next-i18next';
import { useCreateMarketOrder } from './hooks/use-market-mutation';
import { handleError } from '@ui/lib/handle-error';
import { useUser } from '@smart-signer/lib/auth/use-user';
import { getAsset } from '../lib/utils';
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from '@ui/components';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAccount } from '@transaction/lib/hive';

enum ActionType {
  ChangeCostValue = 'changeCostValue',
  ChangeAmountValue = 'changeAmountValue',
  ChangeTotalValue = 'changeTotalValue'
}
type ChangeCostValueAction = {
  type: ActionType.ChangeCostValue;
  cost: string;
};
type ChangeAmountValueAction = {
  type: ActionType.ChangeAmountValue;
  amount: string;
};
type ChangeTotalValueAction = {
  type: ActionType.ChangeTotalValue;
  total: string;
};
type Action = ChangeAmountValueAction | ChangeTotalValueAction | ChangeCostValueAction;

type State = {
  cost: string;
  amount: string;
  total: string;
};
const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case ActionType.ChangeCostValue: {
      return {
        ...state,
        cost: action.cost,
        ...(state.amount &&
          action.cost && {
            total: convertStringToBig(state.amount).times(convertStringToBig(action.cost)).toFixed(6)
          })
      };
    }
    case ActionType.ChangeAmountValue: {
      return {
        ...state,
        amount: action.amount,
        ...(action.amount && {
          total: convertStringToBig(action.amount).times(state.cost).toFixed(3)
        })
      };
    }
    case ActionType.ChangeTotalValue: {
      return {
        ...state,
        total: action.total,
        ...(action.total && {
          amount: convertStringToBig(action.total).div(state.cost).toFixed(3)
        })
      };
    }
    default: {
      return state;
    }
  }
};
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
  const [state, dispatch] = useReducer(reducer, {
    cost: price,
    amount: '',
    total: ''
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useUser();
  const createBuyOrderMutation = useCreateMarketOrder();
  const { data: accountData } = useQuery(['accountData', user.username], () => getAccount(user.username), {
    enabled: !!user.username
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    dispatch({ type: ActionType.ChangeCostValue, cost: price });
  }, [price]);

  const submitOrder = useCallback(async () => {
    const DEFAULT_EXPIRE = new Date(Math.floor(Date.now() / 1000 + 60 * 60 * 24 * 27) * 1000)
      .toISOString()
      .split('.')[0];
    const hbd = await getAsset(state.total, 'hbd');
    const hive = await getAsset(state.amount, 'hive');
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

  const disabled = Boolean(state.amount || state.total);
  const label = transaction === 'sell' ? t('market_page.sell_hive') : t('market_page.buy_hive');
  return (
    <div className="flex w-full flex-col gap-8">
      <div
        className={clsx('sm:text-xl', {
          'text-destructive': transaction === 'sell',
          'text-green-600': transaction === 'buy'
        })}
      >
        {label}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex w-full justify-between text-sm">
          <div className="flex w-24 items-center">{t('market_page.price')}</div>
          <div className="flex w-full">
            <Input
              className="h-8 rounded-none text-end focus-visible:ring-0"
              placeholder="0.0"
              value={state.cost}
              type="number"
              onChange={(e) =>
                dispatch({
                  type: ActionType.ChangeCostValue,
                  cost: e.target.value.replaceAll('-', '')
                })
              }
            />
            <div className="flex w-28 items-center justify-center bg-background-secondary">HBD/HIVE</div>
          </div>
        </div>{' '}
        <div className="flex w-full justify-between text-sm">
          <div className="flex w-24 items-center">{t('market_page.amount')}</div>
          <div className="flex w-full">
            <Input
              className="h-8 rounded-none text-end focus-visible:ring-0"
              placeholder="0.0"
              value={state.amount}
              type="number"
              onChange={(e) =>
                dispatch({
                  type: ActionType.ChangeAmountValue,
                  amount: e.target.value.replaceAll('-', '')
                })
              }
            />
            <div className="flex w-28 items-center justify-center bg-background-secondary">HIVE</div>
          </div>
        </div>{' '}
        <div className="flex w-full justify-between text-sm">
          <div className="flex w-24 items-center">{t('market_page.total')}</div>
          <div className="flex w-full">
            <Input
              className="h-8 rounded-none text-end focus-visible:ring-0"
              placeholder="0.0"
              value={state.total}
              type="number"
              onChange={(e) =>
                dispatch({
                  type: ActionType.ChangeTotalValue,
                  total: e.target.value.replaceAll('-', '')
                })
              }
            />
            <div className="flex w-28 items-center justify-center bg-background-secondary">HBD ($)</div>
          </div>
        </div>
      </div>{' '}
      <div className="flex justify-between">
        <div className="text-xs">
          <div>
            <span
              className="cursor-pointer text-destructive"
              onClick={() =>
                dispatch({
                  type: ActionType.ChangeCostValue,
                  cost: defaultPrice
                })
              }
            >
              {t('market_page.available')}:{' '}
            </span>
            <span>{transaction === 'buy' ? `${accountData?.hbd_balance}` : `${accountData?.balance}`}</span>
          </div>
          <div>
            <span
              className="cursor-pointer text-destructive"
              onClick={() =>
                dispatch({
                  type: ActionType.ChangeCostValue,
                  cost: defaultPrice
                })
              }
            >
              {transaction === 'sell' ? t('market_page.highest_bid') : t('market_page.lowest_ask')}:{' '}
            </span>
            <span>{defaultPrice}</span>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={!disabled}
              variant="outline"
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
          <DialogContent>
            {t('market_page.buy_sell_prompt', {
              operation: transaction === 'buy' ? t('market_page.buy') : t('market_page.sell'),
              hive: state.amount,
              hbd: state.total,
              rate: `${price}/HIVE`
            })}
            <DialogFooter className="flex w-full items-center !justify-between">
              <Button onClick={submitOrder}>{t('market_page.ok')}</Button>
              <Button variant="secondary" onClick={() => setDialogOpen(false)}>
                {t('market_page.close')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

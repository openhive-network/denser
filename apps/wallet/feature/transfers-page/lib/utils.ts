import { TransferFilters } from '@/wallet/components/transfers-history-filter';
import dayjs from 'dayjs';
import { TFunction } from 'i18next';

export const initialFilters: TransferFilters = {
  search: '',
  others: false,
  incoming: false,
  outcoming: false,
  exlude: false
};
type Transfer = {
  type: 'transfer';
  amount?: string;
  from?: string;
  memo?: string;
  to?: string;
};
type ClaimRewardBalance = {
  type: 'claim_reward_balance';
  memo?: string;
  account?: string;
  reward_hbd: Big;
  reward_hive: Big;
  reward_vests: Big;
};
type TransferFromSavings = {
  type: 'transfer_from_savings';
  amount?: string;
  from?: string;
  memo?: string;
  request_id?: number;
  to?: string;
};
type TransferToSavings = {
  type: 'transfer_to_savings';
  amount?: string;
  from?: string;
  memo?: string;
  to?: string;
};
type Interest = {
  type: 'interest';
  interest?: string;
  is_saved_into_hbd_balance?: boolean;
  memo?: string;
  owner?: string;
};
type CancelTransferFromSavings = {
  type: 'cancel_transfer_from_savings';
  from?: string;
  memo?: string;
  request_id?: number;
};
type FillOrder = {
  type: 'fill_order';
  current_orderid?: number;
  current_owner?: string;
  current_pays?: string;
  memo?: string;
  open_orderid?: number;
  open_owner?: string;
  open_pays?: string;
};
type TransferToVesting = {
  type: 'transfer_to_vesting';
  amount?: string;
  from?: string;
  memo?: string;
  to?: string;
};
type WithdrawVesting = {
  type: 'withdraw_vesting';
  amount: string;
  memo?: string;
};

export type Operation =
  | Transfer
  | ClaimRewardBalance
  | TransferFromSavings
  | TransferToSavings
  | Interest
  | CancelTransferFromSavings
  | TransferToVesting
  | FillOrder
  | WithdrawVesting;


/** Time left until `date`, e.g. "15 hours and 50 minutes"; empty once it has passed. */
export function formatRestoreTime(date: Date, t: TFunction<'common_wallet', undefined>): string {
  const today = dayjs();
  const minutes = dayjs(date).diff(today, 'minute') % 60;
  const hours = dayjs(date).diff(today, 'hour');
  const hoursText = hours > 0 ? t('resource_credits.hours', { count: hours }) : '';
  const minutesText = minutes > 0 ? t('resource_credits.minutes', { count: minutes }) : '';
  if (hoursText && minutesText) {
    return t('resource_credits.hours_and_minutes', { hours: hoursText, minutes: minutesText });
  }
  return hoursText || minutesText;
}

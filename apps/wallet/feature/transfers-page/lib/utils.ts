import { TransferFilters } from '@/wallet/components/transfers-history-filter';
import moment from 'moment';

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


export function hoursAndMinutes(date: Date) {
  const today = moment();
  const cooldownMin = moment(date).diff(today, 'minutes') % 60;
  const cooldownH = moment(date).diff(today, 'hours');
  return (
    (cooldownH === 1 ? 'an hour' : cooldownH > 1 ? cooldownH + ' hours' : '') +
    (cooldownH && cooldownMin ? ' and ' : '') +
    (cooldownMin === 1 ? 'a minute' : cooldownMin > 0 ? cooldownMin + ' minutes' : '')
  );
}

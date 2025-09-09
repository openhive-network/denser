import { TransferFilters } from '@/wallet/components/transfers-history-filter';
import { AccountHistory } from '@transaction/lib/extended-hive.chain';
import { convertStringToBig } from '@ui/lib/helpers';
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

export const mapToAccountHistoryObject = ([id, data]: AccountHistory) => {
  const { op, ...rest } = data;
  let operation: Operation | undefined;
  if (!op) operation = undefined;
  if (op) {
    switch (op[0]) {
      default:
        operation = undefined;
      case 'transfer':
        operation = {
          type: 'transfer',
          amount: op[1].amount,
          from: op[1].from,
          memo: op[1].memo,
          to: op[1].to
        };
        break;
      case 'claim_reward_balance':
        operation = {
          type: 'claim_reward_balance',
          account: op[1].account,
          reward_hbd: convertStringToBig(op[1]?.reward_hbd ?? '0'),
          reward_hive: convertStringToBig(op[1]?.reward_hive ?? '0'),
          reward_vests: convertStringToBig(op[1]?.reward_vests ?? '0')
        };
        break;
      case 'transfer_from_savings':
        operation = {
          type: 'transfer_from_savings',
          amount: op[1].amount,
          from: op[1].from,
          request_id: op[1].request_id,
          memo: op[1].memo,
          to: op[1].to
        };
        break;
      case 'transfer_to_savings':
        operation = {
          type: 'transfer_to_savings',
          amount: op[1].amount,
          from: op[1].from,
          memo: op[1].memo,
          to: op[1].to
        };
        break;
      case 'transfer_to_vesting':
        operation = { type: 'transfer_to_vesting', amount: op[1].amount, from: op[1].from, to: op[1].to };
        break;
      case 'interest':
        operation = {
          type: 'interest',
          interest: op[1].interest,
          is_saved_into_hbd_balance: op[1].is_saved_into_hbd_balance,
          owner: op[1].owner
        };
        break;
      case 'cancel_transfer_from_savings':
        operation = { type: 'cancel_transfer_from_savings', from: op[1].from, request_id: op[1].request_id };
        break;
      case 'fill_order':
        operation = { type: 'fill_order', current_pays: op[1].current_pays, open_pays: op[1].open_pays };
        break;
      case 'withdraw_vesting':
        operation = { type: 'withdraw_vesting', amount: op[1]?.vesting_shares ?? '0' };
        break;
    }
  }
  return { id, ...rest, operation };
};

export type AccountHistoryData = ReturnType<typeof mapToAccountHistoryObject>;

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

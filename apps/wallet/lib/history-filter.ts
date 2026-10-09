import type { NaiAsset } from '@hiveio/wax';
import type { HiveOperation } from '@hive/common-hiveio-packages/wax';
import type { TransferFilters } from '@/wallet/components/transfers-history-filter';

type OperationValue = HiveOperation['op']['value'];

const SEARCHABLE_ACCOUNT_FIELDS = ['from', 'to', 'account', 'owner', 'author'] as const;

const involvesSearchedAccount = (opValue: OperationValue, search: string) =>
  SEARCHABLE_ACCOUNT_FIELDS.some((field) => opValue[field]?.includes(search));

interface getFilterArgs {
  filter: TransferFilters;
  username: string;
}

export const getFilter =
  ({ filter, username }: getFilterArgs) =>
  ({ op }: HiveOperation) => {
    const opValue = op?.value;
    if (!opValue) return false;
    if (filter.search && !involvesSearchedAccount(opValue, filter.search)) return false;
    switch (op.type) {
      case 'transfer_operation':
        const incomingFromCurrent = opValue.to === username || opValue.from !== username;
        const outcomingFromCurrent = opValue.from === username || opValue.to !== username;

        return (
          !(filter.exlude && filterSmallerThanOne(opValue.amount)) &&
          (filter.incoming || !incomingFromCurrent) &&
          (filter.outcoming || !outcomingFromCurrent)
        );
      case 'claim_reward_balance_operation':
        if (
          !filter.others ||
          (filter.exlude &&
            opValue.reward_hbd &&
            opValue.reward_hive &&
            opValue.reward_vests
        ))
          return false;
        break;

      case 'transfer_from_savings_operation':
      case 'transfer_to_savings_operation':
      case 'transfer_to_vesting_operation':
        if (!filter.others || (filter.exlude && filterSmallerThanOne(opValue.amount)))
          return false;
        break;
      case 'interest_operation':
        if (!filter.others || (filter.exlude && filterSmallerThanOne(opValue.interest)))
          return false;
        break;
      case 'fill_order_operation':
        if (
          !filter.others ||
          (filter.exlude &&
            filterSmallerThanOne(opValue.open_pays) &&
            filterSmallerThanOne(opValue.current_pays))
        )
          return false;
        break;

      case 'cancel_transfer_from_savings_operation':
        if (!filter.others || filter.exlude) return false;
        break;
      case 'withdraw_vesting_operation':
        if (!filter.others || filter.exlude) return false;
        break;
      case 'author_reward_operation':
        if (!filter.others) return false;
        break;
    }
    return true;
  };

function filterSmallerThanOne(asset?: NaiAsset) {
  if (!asset) return false;
  const {precision, amount} = asset;
  return parseInt(amount, 10) < 10 ** precision;
}

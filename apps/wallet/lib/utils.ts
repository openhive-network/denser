import { convertStringToBig } from '@hive/ui/lib/helpers';
import { IDynamicGlobalProperties } from '@transaction/lib/hive';
import { AccountHistoryData } from '../pages/[param]/transfers';
import { TransferFilters } from '@/wallet/components/transfers-history-filter';
import { useUpdateAuthorityOperationMutation } from '../components/hooks/use-update-authority-mutation';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { SavingsWithdrawals } from './hive';
import { numberWithCommas } from '@ui/lib/utils';
import Big from 'big.js';

export function getCurrentHpApr(data: IDynamicGlobalProperties) {
  // The inflation was set to 9.5% at block 7m
  const initialInflationRate = 9.5;
  const initialBlock = 7000000;

  // It decreases by 0.01% every 250k blocks
  const decreaseRate = 250000;
  const decreasePercentPerIncrement = 0.01;

  // How many increments have happened since block 7m?
  const headBlock = data.head_block_number;
  const deltaBlocks = headBlock - initialBlock;
  const decreaseIncrements = deltaBlocks / decreaseRate;

  // Current inflation rate
  let currentInflationRate = initialInflationRate - decreaseIncrements * decreasePercentPerIncrement;

  // Cannot go lower than 0.95%
  if (currentInflationRate < 0.95) {
    currentInflationRate = 0.95;
  }

  // Now lets calculate the "APR"
  const vestingRewardPercent = data.vesting_reward_percent / 10000;
  const virtualSupply = convertStringToBig(data.virtual_supply);
  const totalVestingFunds = convertStringToBig(data.total_vesting_fund_hive);
  return virtualSupply.times(currentInflationRate).times(vestingRewardPercent).div(totalVestingFunds);
}

interface getFilterArgs {
  filter: TransferFilters;
  totalFund: Big;
  totalShares: Big;
  username: string;
}

export const getFilter =
  ({ filter, totalFund, username, totalShares }: getFilterArgs) =>
  ({ operation }: AccountHistoryData) => {
    if (!operation) return false;
    switch (operation.type) {
      case 'transfer':
        const opAmount = convertStringToBig(operation.amount ?? '0');
        const incomingFromCurrent = operation.to === username || operation.from !== username;
        const outcomingFromCurrent = operation.from === username || operation.to !== username;
        const inSearch = operation.to?.includes(filter.search) || operation.from?.includes(filter.search);

        return (
          !(filter.exlude && opAmount.lt(1)) &&
          (filter.incoming || !incomingFromCurrent) &&
          (filter.outcoming || !outcomingFromCurrent) &&
          inSearch
        );
      case 'claim_reward_balance':
        if (
          !filter.others ||
          (filter.exlude &&
            operation.reward_hbd.lt(1) &&
            operation.reward_hive.lt(1) &&
            totalFund.times(operation.reward_vests.div(totalShares)).lt(1))
        )
          return false;
        break;

      case 'transfer_from_savings':
      case 'transfer_to_savings':
      case 'transfer_to_vesting':
        if (!filter.others || (filter.exlude && convertStringToBig(operation?.amount || '0').lt(1)))
          return false;
        break;
      case 'interest':
        if (!filter.others || (filter.exlude && convertStringToBig(operation?.interest || '0').lt(1)))
          return false;
        break;
      case 'fill_order':
        if (
          !filter.others ||
          (filter.exlude &&
            convertStringToBig(operation?.open_pays || '0').lt(1) &&
            convertStringToBig(operation?.current_pays || '0').lt(1))
        )
          return false;
        break;

      case 'cancel_transfer_from_savings':
        if (!filter.others || filter.exlude) return false;
    }
    return true;
  };

const ASSET_PRECISION = 3;
const VEST_PRECISION = 6;

export const transformWithdraw = (
  withdraw: Big,
  total_vest_hive: Big,
  total_vests: Big,
  format: 'string' | 'big' | 'number'
) => {
  const divide = withdraw.div(total_vest_hive);
  const multiplication = total_vests.times(divide);
  if (format === 'big') return multiplication;
  if (format === 'number') return multiplication.toNumber();
  return numberWithCommas(multiplication.toFixed(VEST_PRECISION));
};

export const getAsset = async (value: string, curr: 'hive' | 'hbd') => {
  if (value.slice(value.indexOf('.')).length > ASSET_PRECISION + 1) {
    throw new Error('There should be maximum of 3 decimal places in amount');
  }
  const chain = await hiveChainService.getHiveChain();
  const amount = Number(Number(value).toFixed(ASSET_PRECISION).replace('.', ''));
  return curr === 'hive' ? chain.hive(amount) : chain.hbd(amount);
};

export const getVests = async (value: string) => {
  if (value.slice(value.indexOf('.')).length > ASSET_PRECISION + 1) {
    throw new Error('There should be maximum of 3 decimal places in amount');
  }
  const chain = await hiveChainService.getHiveChain();
  const amount = Number(Number(value).toFixed(VEST_PRECISION).replace('.', ''));
  return chain.vests(amount);
};

const HIVE_NAI_STRING = '@@000000021';

export const getAmountFromWithdrawal = (withdrawal: SavingsWithdrawals['withdrawals'][number]) => {
  const amount = Number(withdrawal.amount.amount) / 10 ** withdrawal.amount.precision;
  const currency = withdrawal.amount.nai === HIVE_NAI_STRING ? 'HIVE' : 'HBD';

  return `${amount.toFixed(3)} ${currency}`;
};

// The default is the blog domain
export const getExternalLink = (path: string, baseUrl?: string) => {
  if (!baseUrl) {
    const envBlogUrl = (window as any).__ENV?.REACT_APP_BLOG_DOMAIN;

    if (!envBlogUrl) {
      throw new Error('No default blog domain found');
    }
    baseUrl = envBlogUrl;
  }

  const url = new URL(path, baseUrl);

  return url.toString();
};
export const cutPublicKey = (publicKey?: string, width?: number, firstCut: number = 720): string => {
  if (!publicKey) return '';
  if (!width) return `${publicKey.slice(0, 8)}...${publicKey.slice(publicKey.length - 5)}`;
  if (width > firstCut) return publicKey;
  if (width > 500) {
    return `${publicKey.slice(0, 20)}...${publicKey.slice(publicKey.length - 20)}`;
  }
  return `${publicKey.slice(0, 8)}...${publicKey.slice(publicKey.length - 5)}`;
};

export function handleAuthorityError(
  updateAuthorityMutation: ReturnType<typeof useUpdateAuthorityOperationMutation>
) {
  if (!updateAuthorityMutation.isError) return '';
  const rejectedError = updateAuthorityMutation.error;
  if (rejectedError === 'rejected') {
    return 'Operation rejected due of Owner Key';
  }
  const transactionError = updateAuthorityMutation.error as Error;
  const message = transactionError.message;
  try {
    const errorObject = JSON.parse(message.split('Invalid response from API: ')[1]);
    if (errorObject.error.message.includes('owner_update_limit_mgr')) {
      return 'Limit actions reached for this account, wait an hour and try again';
    }
    if (errorObject.error.message.includes('references non-existing')) {
      return errorObject.error.message.split('Assert Exception:a != nullptr: ')[1];
    }
    if (errorObject.error.data.name === 'tx_missing_owner_auth') {
      return errorObject.error.data.message;
    }
  } catch (e) {
    if (message.includes('10 assert_exception: Assert Exception')) {
      return 'One of the keys is invalid';
    }
    if (message.includes('Wax API error: "4 parse_error_exception: Parse Error')) {
      const error = message.split('\n')[2];
      const invalidKey = JSON.parse(error).base58_str;
      return `Invalid key: ${invalidKey}`;
    }
    return message;
  }

  return 'Operation failed';
}

export type KeyAuth = {
  keyOrAccount: string;
  thresholdWeight: number;
};
export function transformKeyAuths(authority: { [keyOrAccount: string]: number }): KeyAuth[] {
  return Object.entries(authority).map(([keyOrAccount, thresholdWeight]) => ({
    keyOrAccount,
    thresholdWeight
  }));
}

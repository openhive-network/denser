import { convertStringToBig } from '@hive/ui/lib/helpers';
import { IDynamicGlobalProperties } from '@transaction/lib/hive';
import { AccountHistoryData } from '../pages/[param]/transfers';
import { TransferFilters } from '@/wallet/components/transfers-history-filter';
import { hiveChainService } from '@transaction/lib/hive-chain-service';

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

const ASSET_PRECISION = 1000;
const VEST_PRECISION = 1000000;

export const getAsset = async (value: string, curr: 'hive' | 'hbd') => {
  const chain = await hiveChainService.getHiveChain();
  const amount = Number(value) * ASSET_PRECISION;
  return curr === 'hive' ? chain.hive(amount) : chain.hbd(amount);
};

export const getVests = async (value: string) => {
  const chain = await hiveChainService.getHiveChain();
  const amount = Number(value) * VEST_PRECISION;
  return chain.vests(amount);
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

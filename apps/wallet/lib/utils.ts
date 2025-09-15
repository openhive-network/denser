import { TFunction } from 'i18next';
import { convertStringToBig } from '@hive/ui/lib/helpers';
import { TransferFilters } from '@/wallet/components/transfers-history-filter';
import { useUpdateAuthorityOperationMutation } from '../components/hooks/use-update-authority-mutation';
import { SavingsWithdrawals, IFollow, IDynamicGlobalProperties, HiveOperation } from '@transaction/lib/extended-hive.chain';
import { numberWithCommas } from '@ui/lib/utils';
import { configuredBlogDomain } from '@ui/config/public-vars';
import Big from 'big.js';
import { HIVE_NAI_STRING, VESTS_PRECISION } from '@transaction/lib/utils';
import { AccountHistoryData } from '../feature/transfers-page/lib/utils';
import { NaiAsset } from '@hiveio/wax';
import { HiveChain } from '@transaction/lib/hive-chain-service';

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
  username: string;
}

export const getFilter =
  ({ filter, username }: getFilterArgs) =>
  ({ op }: HiveOperation) => {
    const opValue = op?.value;
    if (!opValue) return false;
    switch (op.type) {
      case 'transfer_operation':
        const incomingFromCurrent = opValue.to === username || opValue.from !== username;
        const outcomingFromCurrent = opValue.from === username || opValue.to !== username;
        const inSearch = opValue.to?.includes(filter.search) || opValue.from?.includes(filter.search);

        return (
          !(filter.exlude && filterSmallerThanOne(opValue.amount)) &&
          (filter.incoming || !incomingFromCurrent) &&
          (filter.outcoming || !outcomingFromCurrent) &&
          inSearch
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
      case 'withdraw_vesting_operation':
        if (!filter.others || filter.exlude) return false;
    }
    return true;
  };

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
  return numberWithCommas(multiplication.toFixed(VESTS_PRECISION));
};

export const getAmountFromWithdrawal = (withdrawal: SavingsWithdrawals['withdrawals'][number]) => {
  const amount = Number(withdrawal.amount.amount) / 10 ** withdrawal.amount.precision;
  const currency = withdrawal.amount.nai === HIVE_NAI_STRING ? 'HIVE' : 'HBD';

  return `${amount.toFixed(3)} ${currency}`;
};

// The default is the blog domain
export const getExternalLink = (path: string, baseUrl?: string) => {
  if (!baseUrl) {
    const envBlogUrl = configuredBlogDomain;

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

export function createListWithSuggestions(
  username: string,
  t: TFunction<'common_wallet', undefined>,
  transferHistory?: HiveOperation[],
  followingList?: IFollow[]
): { username: string; about: string }[] {
  const following =
    followingList?.map((e) => ({ username: e.following, about: t('profile.following') })) ?? [];
  const transfers =
    transferHistory
      ?.map((e) => {
        let accountName;

        switch (e.op?.type) {
          case 'transfer':
            if (e.op?.value?.to !== username) accountName = e.op?.value?.to;
            if (e.op?.value?.from !== username) accountName = e.op?.value?.from;
            break;
          case 'claim_reward_balance':
            if (e.op?.value?.account !== username) accountName = e.op?.value?.account;
            break;
          case 'transfer_from_savings':
          case 'transfer_to_savings':
            if (e.op?.value?.to !== username) accountName = e.op?.value?.to;
            if (e.op?.value?.from !== username) accountName = e.op?.value?.from;
            break;
          case 'interest':
            if (e.op?.value?.owner !== username) accountName = e.op?.value?.owner;
            break;
          case 'cancel_transfer_from_savings':
            if (e.op?.value?.from !== username) accountName = e.op?.value?.from;
            break;
          case 'fill_order':
            if (e.op?.value?.current_owner !== username) accountName = e.op?.value?.current_owner;
            break;
          case 'transfer_to_vesting':
            if (e.op?.value?.to !== username) accountName = e.op?.value?.to;
            if (e.op?.value?.from !== username) accountName = e.op?.value?.from;
            break;
        }
        return accountName ? { username: accountName } : undefined;
      })
      .filter((item) => item !== undefined)
      .reduce((acc: { username: string; about: string; counter: number }[], curr) => {
        const existing = acc.find((item) => item.username === curr!.username);
        if (existing) {
          existing.counter += 1;
        } else {
          acc.push({ username: curr!.username, about: t('profile.previous_transfers'), counter: 1 });
        }
        return acc;
      }, [])
      .sort((a, b) => b.counter - a.counter)
      .map((e) => ({ username: e.username, about: `${e.counter} ${e.about}` })) ?? [];
  return [...transfers, ...following];
}

export const prepareRC = (rc: string): string => {
  return `${numberWithCommas(convertStringToBig(rc).div(1000000000).toFixed(1))}bil`;
};

export function convertToFormattedHivePower(vests: NaiAsset | undefined, totalVestingFund: string | undefined, totalVestingShares: string | undefined, hiveChain: HiveChain): string {
  let operationHp = hiveChain?.hive(0);
  if (vests) {
    const totalVestingFundNai = hiveChain!.hive((totalVestingFund || "0").replace(" HIVE", "")) ;
    const totalVestingSharesNai = hiveChain!.vests((totalVestingShares || "0").replace(" VESTS", "")) ;
    operationHp = hiveChain?.vestsToHp(vests, totalVestingFundNai, totalVestingSharesNai);
  }
  return hiveChain.formatter.format(operationHp).replace("HIVE", "HIVE POWER");
}

export function filterSmallerThanOne(asset?: NaiAsset) {
  if (!asset) return false;
  const {precision, amount} = asset;
  return parseInt(amount, 10) < 10 ** precision;
}

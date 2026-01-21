import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Big from 'big.js';
import { convertStringToBig } from './helpers';
import { TFunction } from 'i18next';
import type { FullAccount, Entry, IVote, HiveChain } from '@hive/common-hiveio-packages/wax';
import { EAssetName, GetDynamicGlobalPropertiesResponse, NaiAsset } from '@hiveio/wax';
import { parseDate2 } from './parse-date';
import { Symbol, getNaiToSymbol, getPrecision } from './asset-constants';

// Re-export getRoundedAbbreveration from math-utils for backward compatibility
export { getRoundedAbbreveration } from './math-utils';

export interface Asset {
  amount: number;
  symbol: Symbol;
}

/**
 * Parses a string or NaiAsset into an Asset object.
 * Requires asset constants to be initialized via initializeAssetConstants().
 */
export const parseAsset = (sval: string | NaiAsset): Asset => {
  if (typeof sval === 'string') {
    const sp = sval.split(' ');
    return { amount: parseFloat(sp[0]), symbol: Symbol[sp[1] as keyof typeof Symbol] };
  } else {
    const naiToSymbol = getNaiToSymbol();
    return {
      amount: parseFloat(sval.amount.toString()) / Math.pow(10, sval.precision),
      symbol: naiToSymbol[sval.nai]
    };
  }
};

export const prepareVotes = (entry: Entry, votes: IVote[]) => {
  let totalPayout = 0;

  const { pending_payout_value, author_payout_value, curator_payout_value, payout } = entry;

  if (pending_payout_value && author_payout_value && curator_payout_value) {
    totalPayout =
      parseAsset(entry.pending_payout_value).amount +
      parseAsset(entry.author_payout_value).amount +
      parseAsset(entry.curator_payout_value).amount;
  }

  if (payout && Number(totalPayout.toFixed(3)) !== payout) {
    totalPayout += payout;
  }
  const voteRshares = votes && votes.reduce((a, b) => a + b.rshares, 0);
  const ratio = totalPayout / voteRshares;

  return votes.map((a) => {
    const rew = a.rshares * ratio;

    return Object.assign({}, a, {
      reward: rew,
      timestamp: parseDate2(a.time).getTime(),
      percent: a.percent / 100
    });
  });
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const blockGap = (
  head_block: number,
  last_block: number,
  t: TFunction<'common_wallet', undefined>
) => {
  if (!last_block || last_block < 1) return 'forever';
  const secs = (head_block - last_block) * 3;
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (secs < 60) return t('witnesses_page.bock_gap.just_now');
  if (secs < 120) return t('witnesses_page.bock_gap.recently');
  if (mins < 120) return mins + t('witnesses_page.bock_gap.mins_ago');
  if (hrs < 48) return hrs + t('witnesses_page.bock_gap.hrs_ago');
  if (days < 14) return days + t('witnesses_page.bock_gap.days_ago');
  if (weeks < 4) return weeks + t('witnesses_page.bock_gap.weeks_ago');
  if (months < 24) return months + t('witnesses_page.bock_gap.months_ago');
  return years + t('witnesses_page.bock_gap.years_ago');
};

export const numberWithCommas = (x: string) => x.replace(/\\B(?=(\d{3})+(?!\d))/g, ',');

export function convertToHP(
  vests: Big | NaiAsset,
  chain: HiveChain,
  totalVestingShares: NaiAsset,
  totalVestingFundHive: NaiAsset,
  div: number = 1
): Big {
  // Convert Big to NaiAsset if needed
  let vestsAsNai: NaiAsset;
  if ('nai' in vests) {
    vestsAsNai = vests;
  } else {
    // Convert Big to satoshis (multiply by 10^precision)
    const vestsPrecision = getPrecision(EAssetName.VESTS);
    const satoshis = vests.times(Big(10).pow(vestsPrecision)).toFixed(0);
    vestsAsNai = chain.vestsSatoshis(satoshis);
  }

  // Use wax's vestsToHp for the conversion
  const hpAsset = chain.vestsToHp(vestsAsNai, totalVestingFundHive, totalVestingShares);

  // Convert NaiAsset back to Big and apply divisor
  const hpBig = Big(hpAsset.amount).div(Big(10).pow(hpAsset.precision));
  return hpBig.div(div);
}

export function powerdownHive(
  accountData: FullAccount,
  dynamicData: GetDynamicGlobalPropertiesResponse,
  chain: HiveChain
): Big {
  const withdrawRateVests = convertStringToBig(accountData.vesting_withdraw_rate).toNumber();
  const toWithdraw =
    typeof accountData.to_withdraw === 'number'
      ? accountData.to_withdraw
      : parseFloat(String(accountData.to_withdraw));
  const withdrawn =
    typeof accountData.withdrawn === 'number'
      ? accountData.withdrawn
      : parseFloat(String(accountData.withdrawn));
  const remainingVests = (toWithdraw - withdrawn) / 1000000;
  const vests = Math.min(withdrawRateVests, remainingVests);

  // Convert vests to NaiAsset and use wax for conversion
  const vestsPrecision = getPrecision(EAssetName.VESTS);
  const satoshis = Math.floor(vests * Math.pow(10, vestsPrecision)).toString();
  const vestsAsNai = chain.vestsSatoshis(satoshis);

  const hpAsset = chain.vestsToHp(
    vestsAsNai,
    dynamicData.total_vesting_fund_hive,
    dynamicData.total_vesting_shares
  );

  return Big(hpAsset.amount).div(Big(10).pow(hpAsset.precision));
}

export function findAndParseJSON(value: string) {
  const valueJSON = value.slice(value.indexOf('{'), value.lastIndexOf('}') + 1);
  return JSON.parse(valueJSON);
}

export function isJSON(value: string) {
  try {
    JSON.parse(value);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Return cookie value for given cookie name. For use on client only.
 * When cookie doesn't exist returns empty string.
 *
 * @param name - Cookie name
 * @returns Cookie value or empty string if not found
 */
export const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() ?? '';
  return '';
};

/**
 * Checks if a string is a valid Hive community identifier.
 * A valid community starts with 'hive-' followed by exactly 6 digits.
 *
 * @param value - The string to check (can be undefined)
 * @returns true if the string is a valid community identifier, false otherwise
 *
 * @example
 * isCommunity('hive-123456') // true
 * isCommunity('hive-a23456') // false
 * isCommunity('hive-12345')  // false (only 5 digits)
 * isCommunity('hive-1234567') // false (7 digits)
 * isCommunity(undefined)      // false
 */
export function isCommunity(value: string | undefined | null): boolean {
  if (!value) return false;
  if (!value.startsWith('hive-')) return false;

  const digits = value.slice(5);
  if (digits.length !== 6) return false;

  return !Number.isNaN(Number(digits));
}

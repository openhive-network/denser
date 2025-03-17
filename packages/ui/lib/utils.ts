import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Big from 'big.js';
import { convertStringToBig } from './helpers';
import { TFunction } from 'i18next';
import type { FullAccount } from '@hive/transaction/lib/app-types';
import type { IDynamicGlobalProperties, IVote } from '@hive/transaction/lib/hive';
import { NaiAsset } from '@hiveio/wax';
import { Entry } from '@hive/transaction/lib/bridge';
import { parseDate2 } from './parse-date';
import { Toast, toast } from '@ui/components/hooks/use-toast';
import { transformError } from '@hive/transaction/lib/transform-error';

export const isCommunity = (s: string): boolean => s.match(/^hive-\d+/) !== null;

export interface Asset {
  amount: number;
  symbol: Symbol;
}

export const parseAsset = (sval: string | NaiAsset): Asset => {
  if (typeof sval === 'string') {
    const sp = sval.split(' ');
    // @ts-ignore
    return { amount: parseFloat(sp[0]), symbol: Symbol[sp[1]] };
  } else {
    // @ts-ignore
    return {
      amount: parseFloat(sval.amount.toString()) / Math.pow(10, sval.precision),
      // @ts-ignore
      symbol: NaiMap[sval.nai]
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
  const voteRshares = votes && votes.reduce((a, b) => a + parseFloat(b.rshares), 0);
  const ratio = totalPayout / voteRshares;

  return votes.map((a) => {
    const rew = parseFloat(a.rshares) * ratio;

    return Object.assign({}, a, {
      reward: rew,
      timestamp: parseDate2(a.time).getTime(),
      percent: a.percent / 100
    });
  });
};

export const vestsToRshares = (vests: number, votingPower: number, votePerc: number): number => {
  const vestingShares = vests * 1e6;
  const power = (votingPower * votePerc) / 1e4 / 50 + 1;
  return (power * vestingShares) / 1e4;
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
export function getRoundedAbbreveration(
  numToRefactor: Big,
  toComma = 2,
  multiplicators = ['K', 'M', 'T', 'P', 'E', 'Z', 'Y', 'R', 'Q']
) {
  if (numToRefactor.lt(1000)) return numToRefactor.toFixed(toComma);
  let mulIndex = 0;
  for (let t = numToRefactor; t.div(1000).gte(1); mulIndex++) {
    t = t.div(1000);
  }

  return numToRefactor.div(new Big(1000).pow(mulIndex)).toFixed(toComma) + multiplicators[mulIndex - 1];
}

export const numberWithCommas = (x: string) => x.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export function vestingHive(accountData: FullAccount, dynamicData: IDynamicGlobalProperties) {
  const vests = convertStringToBig(accountData.vesting_shares);
  const total_vests = convertStringToBig(dynamicData.total_vesting_shares);
  const total_vest_hive = convertStringToBig(dynamicData.total_vesting_fund_hive);
  const vesting_hivef = total_vest_hive.times(vests).div(total_vests);
  return vesting_hivef;
}
export function delegatedHive(accountData: FullAccount, dynamicData: IDynamicGlobalProperties) {
  const delegated_vests = convertStringToBig(accountData.delegated_vesting_shares);
  const received_vests = convertStringToBig(accountData.received_vesting_shares);
  const vests = delegated_vests.minus(received_vests);
  const total_vests = convertStringToBig(dynamicData.total_vesting_shares);
  const total_vest_hive = convertStringToBig(dynamicData.total_vesting_fund_hive);
  const vesting_hivef = total_vest_hive.times(vests.div(total_vests));
  return vesting_hivef;
}

export function accountDelegatedHive(accountData: FullAccount, dynamicData: IDynamicGlobalProperties) {
  const vests = convertStringToBig(accountData.delegated_vesting_shares);
  const total_vests = convertStringToBig(dynamicData.total_vesting_shares);
  const total_vest_hive = convertStringToBig(dynamicData.total_vesting_fund_hive);
  const vesting_hivef = total_vest_hive.times(vests.div(total_vests));
  return vesting_hivef;
}

export function withdrawHive(withdraw: number, dynamicData: IDynamicGlobalProperties) {
  const vests = Big(withdraw);
  const total_vests = convertStringToBig(dynamicData.total_vesting_shares);
  const total_vest_hive = convertStringToBig(dynamicData.total_vesting_fund_hive);
  const vesting_hivef = total_vest_hive.times(vests.div(total_vests));
  return vesting_hivef.div(1000000);
}

export function powerdownHive(accountData: FullAccount, dynamicData: IDynamicGlobalProperties) {
  const withdraw_rate_vests = parseFloat(accountData.vesting_withdraw_rate.split(' ')[0]);
  const to_withdraw =
    typeof accountData.to_withdraw === 'number'
      ? accountData.to_withdraw
      : parseFloat(accountData.to_withdraw);
  const withdrawn =
    typeof accountData.withdrawn === 'number' ? accountData.withdrawn : parseFloat(accountData.withdrawn);
  const remaining_vests = (to_withdraw - withdrawn) / 1000000;
  const vests = Math.min(withdraw_rate_vests, remaining_vests);
  const total_vests = convertStringToBig(dynamicData.total_vesting_shares);
  const total_vest_hive = convertStringToBig(dynamicData.total_vesting_fund_hive);
  const powerdown_hivef = total_vest_hive.times(Big(vests).div(total_vests));
  return powerdown_hivef;
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

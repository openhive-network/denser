import { SMTAsset } from '@hiveio/dhive/lib/chain/asset';
import Big from 'big.js';
import { ClassValue, clsx } from 'clsx';
import sanitize from 'sanitize-html';
import { twMerge } from 'tailwind-merge';

import remarkableStripper from '@/lib/remmarkable-stripper';
import { convertStringToBig } from './helpers';
import { DynamicGlobalProperties } from './hive';
import { FullAccount } from '@/store/app-types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const vestsToRshares = (vests: number, votingPower: number, votePerc: number): number => {
  const vestingShares = vests * 1e6;
  const power = (votingPower * votePerc) / 1e4 / 50 + 1;
  return (power * vestingShares) / 1e4;
};

export const isCommunity = (s: string) => s.match(/^hive-\d+/) !== null;

export enum Symbol {
  HIVE = 'HIVE',
  HBD = 'HBD',
  VESTS = 'VESTS',
  SPK = 'SPK'
}

export enum NaiMap {
  '@@000000021' = 'HIVE',
  '@@000000013' = 'HBD',
  '@@000000037' = 'VESTS'
}

export interface Asset {
  amount: number;
  symbol: Symbol;
}

export const parseAsset = (sval: string | SMTAsset): Asset => {
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

const isHumanReadable = (input: number): boolean => {
  return Math.abs(input) > 0 && Math.abs(input) <= 100;
};

export const accountReputation = (input: string | number): number => {
  if (typeof input === 'number' && isHumanReadable(input)) {
    return Math.floor(input);
  }

  if (typeof input === 'string') {
    input = Number(input);

    if (isHumanReadable(input)) {
      return Math.floor(input);
    }
  }

  if (input === 0) {
    return 25;
  }

  let neg = false;

  if (input < 0) neg = true;

  let reputationLevel = Math.log10(Math.abs(input));
  reputationLevel = Math.max(reputationLevel - 9, 0);

  if (reputationLevel < 0) reputationLevel = 0;

  if (neg) reputationLevel *= -1;

  reputationLevel = reputationLevel * 9 + 25;

  return Math.floor(reputationLevel);
};

export const getHivePower = (
  totalHive: any,
  totalVests: any,
  vesting_shares: any,
  delegated_vesting_shares: any,
  received_vesting_shares: any
) => {
  const hive = new Big(vesting_shares)
    .minus(new Big(delegated_vesting_shares))
    .plus(new Big(received_vesting_shares));
  const hiveDividedByVests = new Big(totalVests).div(new Big(totalHive));
  return hive.div(hiveDividedByVests).toFixed(0);
};

export const numberWithCommas = (x: any) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export function extractBodySummary(body: any, stripQuotes = false) {
  let desc = body;

  if (stripQuotes) desc = desc.replace(/(^(\n|\r|\s)*)>([\s\S]*?).*\s*/g, '');
  desc = remarkableStripper.render(desc); // render markdown to html
  desc = sanitize(desc, { allowedTags: [] }); // remove all html, leaving text
  desc = htmlDecode(desc);

  // Strip any raw URLs from preview text
  desc = desc.replace(/https?:\/\/[^\s]+/g, '');

  // Grab only the first line (not working as expected. does rendering/sanitizing strip newlines?)
  // eslint-disable-next-line prefer-destructuring
  desc = desc.trim().split('\n')[0];

  if (desc.length > 200) {
    desc = desc.substring(0, 200).trim();

    // Truncate, remove the last (likely partial) word (along with random punctuation), and add ellipses
    desc = desc
      .substring(0, 180)
      .trim()
      .replace(/[,!?]?\s+[^\s]+$/, '…');
  }

  return desc;
}

export function getPostSummary(jsonMetadata: any, body: any, stripQuotes = false) {
  const shortDescription = jsonMetadata?.description;

  if (!shortDescription) {
    return extractBodySummary(body, stripQuotes);
  }

  return shortDescription;
}

export const htmlDecode = (txt: any) =>
  txt.replace(/&[a-z]+;/g, (ch: any) => {
    // @ts-ignore
    const char = htmlCharMap[ch.substring(1, ch.length - 1)];
    return char ? char : ch;
  });

const htmlCharMap = {
  amp: '&',
  quot: '"',
  lsquo: '‘',
  rsquo: '’',
  sbquo: '‚',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  hearts: '♥',
  trade: '™',
  hellip: '…',
  pound: '£',
  copy: ''
};
export function delegatedHive(accountData: FullAccount, dynamicData: DynamicGlobalProperties) {
  const delegated_vests = convertStringToBig(accountData.delegated_vesting_shares);
  const received_vests = convertStringToBig(accountData.received_vesting_shares);
  const vests = delegated_vests.minus(received_vests);
  const total_vests = convertStringToBig(dynamicData.total_vesting_shares);
  const total_vest_hive = convertStringToBig(dynamicData.total_vesting_fund_hive);
  const vesting_hivef = total_vest_hive.times(vests.div(total_vests));
  return vesting_hivef;
}
export function getCurrentHpApr(data: DynamicGlobalProperties) {
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
export function vestingHive(accountData: FullAccount, dynamicData: DynamicGlobalProperties) {
  const vests = convertStringToBig(accountData.vesting_shares);
  const total_vests = convertStringToBig(dynamicData.total_vesting_shares);
  const total_vest_hive = convertStringToBig(dynamicData.total_vesting_fund_hive);
  const vesting_hivef = total_vest_hive.times(vests).div(total_vests);
  return vesting_hivef;
}
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
export const blockGap = (head_block: number, last_block: number) => {
  if (!last_block || last_block < 1) return 'forever';
  const secs = (head_block - last_block) * 3;
  const mins = Math.floor(secs / 60);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (secs < 60) return 'just now';
  if (secs < 120) return 'recently';
  if (mins < 120) return mins + ' mins ago';
  if (hrs < 48) return hrs + ' hrs ago';
  if (days < 14) return days + ' days ago';
  if (weeks < 4) return weeks + ' weeks ago';
  if (months < 24) return months + ' months ago';
  return years + ' years ago';
};

export function amt(string_amount: string) {
  return parsePayoutAmount(string_amount);
}

export function parsePayoutAmount(amount: string) {
  return parseFloat(String(amount).replace(/\s[A-Z]*$/, ''));
}

export function fmt(decimal_amount: any, asset = null) {
  return formatDecimal(decimal_amount).join('') + (asset ? ' ' + asset : '');
}

function fractional_part_len(value: any) {
  const parts = (Number(value) + '').split('.');
  return parts.length < 2 ? 0 : parts[1].length;
}

export function formatDecimal(value: any, decPlaces = 2, truncate0s = true) {
  let fl, j;
  // eslint-disable-next-line no-void,no-restricted-globals
  if (value === null || value === void 0 || isNaN(value)) {
    return ['N', 'a', 'N'];
  }
  if (truncate0s) {
    fl = fractional_part_len(value);
    if (fl < 2) fl = 2;
    if (fl < decPlaces) decPlaces = fl;
  }
  const decSeparator = '.';
  const thouSeparator = ',';
  const sign = value < 0 ? '-' : '';
  const abs_value = Math.abs(value);
  const i = parseInt(abs_value.toFixed(decPlaces), 10) + '';
  j = i.length;
  j = i.length > 3 ? j % 3 : 0;
  // @ts-ignore
  const decPart = decPlaces
    ? decSeparator +
      // @ts-ignore
      Math.abs(abs_value - i)
        .toFixed(decPlaces)
        .slice(2)
    : '';
  return [
    sign +
      (j ? i.substr(0, j) + thouSeparator : '') +
      i.substr(j).replace(/(\d{3})(?=\d)/g, '$1' + thouSeparator),
    decPart
  ];
}

import Big from 'big.js';
import sanitize from 'sanitize-html';
import remarkableStripper from '../lib/remmarkable-stripper';
import { JsonMetadata } from '@transaction/lib/bridge';
import moment from 'moment';
import { TFunction } from 'i18next';
import { FullAccount } from '@transaction/lib/app-types';
import { getRenderer } from './renderer';

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

export type sortTypes = 'trending' | 'hot' | 'created' | 'payout' | 'muted';
export const sortToTitle = (sort: sortTypes) => {
  switch (sort) {
    case 'trending':
      return 'Trending';
    case 'hot':
      return 'Hot';
    case 'created':
      return 'New';
    case 'payout':
      return 'Pending';
    case 'muted':
      return 'Muted';
    default:
      return 'Trending';
  }
};

export const debounce = (fn: Function, delay: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return function (...args: any[]) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
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
  totalHive: number,
  totalVests: number,
  vesting_shares: number,
  delegated_vesting_shares: number,
  received_vesting_shares: number
) => {
  const hive = new Big(vesting_shares)
    .minus(new Big(delegated_vesting_shares))
    .plus(new Big(received_vesting_shares));
  const hiveDividedByVests = new Big(totalVests).div(new Big(totalHive));
  return hive.div(hiveDividedByVests).toFixed(0);
};

export function extractBodySummary(body: string, stripQuotes = false) {
  let desc = body;
  const MAX_SIZE = 255;

  if (stripQuotes) desc = desc.replace(/(^(\n|\r|\s)*)>([\s\S]*?).*\s*/g, '');
  desc = remarkableStripper.render(desc); // render markdown to html
  desc = sanitize(desc, { allowedTags: [] }); // remove all html, leaving text
  desc = htmlDecode(desc);

  // Strip any raw URLs from preview text
  desc = desc.replace(/https?:\/\/[^\s]+/g, '');

  // Grab only the first line (not working as expected. does rendering/sanitizing strip newlines?)
  // eslint-disable-next-line prefer-destructuring
  desc = desc.trim().split('\n')[0];

  if (desc.length > MAX_SIZE) {
    desc = desc.substring(0, MAX_SIZE).trim();

    // Truncate, remove the last (likely partial) word (along with random punctuation), and add ellipses
    desc = desc
      .substring(0, MAX_SIZE - 20)
      .trim()
      .replace(/[,!?]?\s+[^\s]+$/, '…');
  }

  return desc;
}

export function getPostSummary(jsonMetadata: JsonMetadata, body: string, stripQuotes = false) {
  const shortDescription = jsonMetadata?.description ? jsonMetadata?.description : jsonMetadata?.summary;

  if (!shortDescription) {
    return extractBodySummary(body, stripQuotes);
  }

  return shortDescription;
}

export const htmlDecode = (txt: string) =>
  txt.replace(/&[a-z]+;/g, (ch: string) => {
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

export function amt(string_amount: string) {
  return parsePayoutAmount(string_amount);
}

export function parsePayoutAmount(amount: string) {
  return parseFloat(String(amount).replace(/\s[A-Z]*$/, ''));
}

export function fmt(decimal_amount: number | string, asset = null) {
  return formatDecimal(Number(decimal_amount)).join('') + (asset ? ' ' + asset : '');
}

function fractional_part_len(value: number) {
  const parts = (Number(value) + '').split('.');
  return parts.length < 2 ? 0 : parts[1].length;
}

export function formatDecimal(value: number, decPlaces = 2, truncate0s = true) {
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

export function extractUrlsFromJsonString(jsonString: string): string[] {
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
  const matches = jsonString.match(urlRegex);
  return matches || [];
}

export function extractLinks(text: string): string[] {
  const urlRegex = /https?:\\?\/\\?\/[^\s]+/g;
  const markdownImageRegex = /!\[.*?\]\((https?:\\?\/\\?\/[^\s]+)\)/g;
  const otherUrlRegex = /https?:\/\/[^\s\)]*\/[^\s\)]*/g;
  const matches: string[] = [];
  const otherMatches = text.match(otherUrlRegex);
  if (otherMatches) {
    otherMatches.forEach((match) => {
      matches.push(match);
    });
  }
  const standaloneMatches = text.match(urlRegex);
  if (standaloneMatches) {
    standaloneMatches.forEach((match) => {
      const cleanedMatch = match.endsWith(')') ? match.slice(0, -1) : match;
      matches.push(cleanedMatch);
    });
  }
  const markdownImageMatches = text.match(markdownImageRegex);
  if (markdownImageMatches) {
    markdownImageMatches.forEach((match) => {
      const urlMatch = match.match(/https?:\\?\/\\?\/[^\s]+/);
      if (urlMatch) {
        const cleanedMatch = urlMatch[0].endsWith(')') ? urlMatch[0].slice(0, -1) : urlMatch[0];
        matches.push(cleanedMatch);
      }
    });
  }
  return matches;
}

/**
 * Finds all images in markdown content, so also in html content, and
 * returns their `src` attribute.
 *
 * @export
 * @param {string} markdownContent
 * @return {*}  {string[]}
 */
export function extractImagesSrc(markdownContent: string): string[] {
  if (markdownContent === '') return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(getRenderer('').render(markdownContent), 'text/html');
  const images = doc.getElementsByTagName('img');
  const result = [];
  for (let i = 0; i < images.length; i++) {
    // logger.info('extractImages found image src: %o', images[i].src);
    result.push(images[i].src);
  }
  return result;
}

export function extractYouTubeVideoIds(urls: string[]): string[] {
  const youtubeLinkRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed|shorts\/|v\/)?([a-zA-Z0-9_-]+)/i;

  const youtubeVideoIds: string[] = [];
  for (const url of urls) {
    const match = url.match(youtubeLinkRegex);
    if (match && match[1]) {
      youtubeVideoIds.push(match[1]);
    }
  }

  return youtubeVideoIds;
}

export function extractPictureFromPostBody(urls: string[]): string[] {
  const picturesRegex = /(?:https?:\/\/)?(?:images\.hive\.blog)\/([a-zA-Z0-9_\/-]+\.(jpeg|png|jpg|webp))/i;

  const picturesFromPostBody: string[] = [];
  for (const url of urls) {
    const match = url.match(picturesRegex);
    if (match && match[1]) {
      picturesFromPostBody.push(`https://images.hive.blog/${match[1]}`);
    }
  }

  return picturesFromPostBody;
}

export function hoursAndMinutes(date: Date, t: TFunction) {
  const today = moment();
  const cooldownMin = moment(date).diff(today, 'minutes') % 60;
  const cooldownH = moment(date).diff(today, 'hours');

  return (
    (cooldownH === 1
      ? t('global.time.an_hour')
      : cooldownH > 1
        ? cooldownH + ' ' + t('global.time.hours')
        : '') +
    (cooldownH && cooldownMin ? ' and ' : '') +
    (cooldownMin === 1
      ? t('global.time.a_minute')
      : cooldownMin > 0
        ? cooldownMin + ' ' + t('global.time.minutes')
        : '')
  );
}

export function getRewardsString(account: FullAccount, t: TFunction): string {
  const nothingToClaim = t('global.no_rewards');
  const reward_hive =
    parseFloat(account.reward_hive_balance.split(' ')[0]) > 0 ? account.reward_hive_balance : null;
  const reward_hbd =
    parseFloat(account.reward_hbd_balance.split(' ')[0]) > 0 ? account.reward_hbd_balance : null;
  const reward_hp =
    parseFloat(account.reward_vesting_hive.split(' ')[0]) > 0
      ? account.reward_vesting_hive.replace('HIVE', 'HP')
      : null;

  const rewards = [];
  if (reward_hive) rewards.push(reward_hive);
  if (reward_hbd) rewards.push(reward_hbd);
  if (reward_hp) rewards.push(reward_hp);

  let rewards_str;
  switch (rewards.length) {
    case 3:
      rewards_str = `${rewards[0]}, ${rewards[1]} and ${rewards[2]}`;
      break;
    case 2:
      rewards_str = `${rewards[0]} and ${rewards[1]}`;
      break;
    case 1:
      rewards_str = `${rewards[0]}`;
      break;
    default:
      rewards_str = nothingToClaim;
  }
  return rewards_str;
}

export function netVests(account: FullAccount) {
  const vests = parseFloat(account.vesting_shares);
  const delegated = parseFloat(account.delegated_vesting_shares);
  const received = parseFloat(account.received_vesting_shares);
  return vests - delegated + received;
}

export function compareDates(dateStrings: string[]) {
  const dates = dateStrings.map((dateStr) => moment(dateStr));

  const today = moment();
  let closestDate = dates[0];
  let minDiff = Math.abs(today.diff(dates[0], 'days'));

  dates.forEach((date) => {
    const diff = Math.abs(date.diff(today, 'days'));
    if (diff < minDiff) {
      minDiff = diff;
      closestDate = date;
    }
  });

  return closestDate.format('YYYY-MM-DDTHH:mm:ss');
}

import sanitize from 'sanitize-html';
import remarkableStripper from '../lib/remmarkable-stripper';
import { Entry, JsonMetadata, FullAccount } from '@hive/common-hiveio-packages/wax';
import dayjs from 'dayjs';
import { TFunction } from 'i18next';
import { proxifyImageSrc, Symbol, accountReputation } from '@hive/ui';
import { convertStringToBig, formatNaiAsset } from '@ui/lib/helpers';

// Re-export Symbol and accountReputation for backwards compatibility
export { Symbol, accountReputation };
// NaiMap is replaced by NaiToSymbol from @hive/ui

export const DEFAULT_OBSERVER = 'hive.blog';
export type SortTypes = 'trending' | 'hot' | 'created' | 'payout' | 'muted';

export interface Preferences {
  nsfw: 'hide' | 'warn' | 'show';
  blog_rewards: '0%' | '50%' | '100%';
  comment_rewards: '0%' | '50%' | '100%';
  referral_system: 'enabled' | 'disabled';
}

export const DEFAULT_PREFERENCES: Preferences = {
  nsfw: 'warn',
  blog_rewards: '50%',
  comment_rewards: '50%',
  referral_system: 'enabled'
};

export const sortToTitle = (sort: SortTypes) => {
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

export const debounce = <T extends (...args: unknown[]) => unknown>(fn: T, delay: number) => {
  let timer: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

export function extractBodySummary(body: string, stripQuotes = false) {
  let desc = body;

  if (stripQuotes) desc = desc.replace(/(^(\n|\r|\s)*)>([\s\S]*?).*\s*/g, '');
  desc = remarkableStripper.render(desc); // render markdown to html
  desc = sanitize(desc, { allowedTags: [] }); // remove all html, leaving text
  desc = htmlDecode(desc);

  // Strip any raw URLs from preview text
  desc = desc.replace(/https?:\/\/[^\s]+/g, '');

  // Grab only the first line (not working as expected. does rendering/sanitizing strip newlines?)
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

export function getPostSummary(jsonMetadata: JsonMetadata, body: string, stripQuotes = false) {
  const shortDescription = jsonMetadata?.description ? jsonMetadata?.description : jsonMetadata?.summary;

  if (!shortDescription) {
    return extractBodySummary(body, stripQuotes);
  }

  return shortDescription;
}

export const htmlDecode = (txt: string) =>
  txt.replace(/&[a-z]+;/g, (ch: string) => {
    // @ts-ignore - Dynamic property access for HTML entity decoding, all keys are validated strings
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

export function amt(stringAmount: string) {
  return parsePayoutAmount(stringAmount);
}

export function parsePayoutAmount(amount: string) {
  return parseFloat(String(amount).replace(/\s[A-Z]*$/, ''));
}

export function fmt(decimalAmount: number | string, asset = null) {
  return formatDecimal(Number(decimalAmount)).join('') + (asset ? ' ' + asset : '');
}

function fractionalPartLen(value: number) {
  const parts = (Number(value) + '').split('.');
  return parts.length < 2 ? 0 : parts[1].length;
}

export function formatDecimal(value: number, decPlaces = 2, truncate0s = true) {
  let fl, j;
  if (value === null || value === void 0 || isNaN(value)) {
    return ['N', 'a', 'N'];
  }
  if (truncate0s) {
    fl = fractionalPartLen(value);
    if (fl < 2) fl = 2;
    if (fl < decPlaces) decPlaces = fl;
  }
  const decSeparator = '.';
  const thouSeparator = ',';
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  const i = parseInt(absValue.toFixed(decPlaces), 10) + '';
  j = i.length;
  j = i.length > 3 ? j % 3 : 0;
  // @ts-ignore - Ternary operator returns compatible string/boolean types for formatting logic
  const decPart = decPlaces
    ? decSeparator +
      // @ts-ignore - Type coercion for decimal calculation is intentional for number formatting
      Math.abs(absValue - i)
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

export function extractPictureFromPostBody(urls: string[]): string[] {
  const picturesRegex = /(?:https?:\/\/)?(?:images\.hive\.blog)\/([a-zA-Z0-9_\/-]+\.(jpeg|png|jpg|webp))/i;

  const picturesFromPostBody: string[] = [];
  for (const url of urls) {
    const match = url.match(picturesRegex);
    if (match && match[1]) {
      picturesFromPostBody.push(proxifyImageSrc(match[0]));
    }
  }

  return picturesFromPostBody;
}

export function hoursAndMinutes(date: Date, t: TFunction<'common_blog', undefined>) {
  const today = dayjs();
  const cooldownMin = dayjs(date).diff(today, 'minute') % 60;
  const cooldownH = dayjs(date).diff(today, 'hour');

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

export function getRewardsString(account: FullAccount, t: TFunction<'common_blog', undefined>): string {
  const nothingToClaim = t('global.no_rewards');
  const hiveAmount = convertStringToBig(account.reward_hive_balance);
  const hbdAmount = convertStringToBig(account.reward_hbd_balance);
  const vestingHiveAmount = convertStringToBig(account.reward_vesting_hive);

  const rewardHive = hiveAmount.gt(0) ? formatNaiAsset(account.reward_hive_balance, 'HIVE') : null;
  const rewardHbd = hbdAmount.gt(0) ? formatNaiAsset(account.reward_hbd_balance, 'HBD') : null;
  const rewardHp = vestingHiveAmount.gt(0) ? formatNaiAsset(account.reward_vesting_hive, 'HP') : null;

  const rewards = [];
  if (rewardHive) rewards.push(rewardHive);
  if (rewardHbd) rewards.push(rewardHbd);
  if (rewardHp) rewards.push(rewardHp);

  let rewardsStr;
  switch (rewards.length) {
    case 3:
      rewardsStr = `${rewards[0]}, ${rewards[1]} and ${rewards[2]}`;
      break;
    case 2:
      rewardsStr = `${rewards[0]} and ${rewards[1]}`;
      break;
    case 1:
      rewardsStr = `${rewards[0]}`;
      break;
    default:
      rewardsStr = nothingToClaim;
  }
  return rewardsStr;
}

export function netVests(account: FullAccount) {
  const vests = convertStringToBig(account.vesting_shares);
  const delegated = convertStringToBig(account.delegated_vesting_shares);
  const received = convertStringToBig(account.received_vesting_shares);
  return vests.minus(delegated).plus(received).toNumber();
}

export function compareDates(dateStrings: string[]) {
  const dates = dateStrings.map((dateStr) => dayjs(dateStr));

  const today = dayjs();
  let closestDate = dates[0];
  let minDiff = Math.abs(today.diff(dates[0], 'day'));

  dates.forEach((date) => {
    const diff = Math.abs(date.diff(today, 'day'));
    if (diff < minDiff) {
      minDiff = diff;
      closestDate = date;
    }
  });

  return closestDate.format('YYYY-MM-DDTHH:mm:ss');
}

export const getMutedComments = (list: string[], discussion: Record<string, Entry>) => {
  const filteredByAuthorMuted: Record<string, Entry> = {};
  Object.keys(discussion).map((key) => {
    filteredByAuthorMuted[key] = {
      ...discussion[key],
      stats: {
        flag_weight: discussion[key].stats?.flag_weight ?? 0,
        gray: list.includes(discussion[key].author) ? true : (discussion[key].stats?.gray ?? false),
        hide: discussion[key].stats?.hide ?? false,
        total_votes: discussion[key].stats?.total_votes ?? 0,
        is_pinned: discussion[key].stats?.is_pinned ?? false
      }
    };
  });
  return filteredByAuthorMuted;
};
export function extractUrlsFromJsonString(jsonString: string): string[] {
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
  const matches = jsonString.match(urlRegex);
  return matches || [];
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

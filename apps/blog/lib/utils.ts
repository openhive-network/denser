import { Entry, FullAccount } from '@hive/common-hiveio-packages/wax';
import dayjs from 'dayjs';
import { TFunction } from 'i18next';
import { Symbol } from '@ui/lib/asset-constants';
import { accountReputation } from '@ui/lib/reputation';
import { convertStringToBig } from '@ui/lib/helpers';
import { formatAsset } from '@ui/lib/asset-format';
import { formatList } from '@ui/lib/locale-format';
import { commonVariables } from '@ui/lib/common-variables';
import { configuredFypApiUrl } from '@ui/config/public-vars';
import { matchHiveBlogImageUrl } from './body-image-url';

// Re-export Symbol and accountReputation for backwards compatibility
export { Symbol, accountReputation };
// NaiMap is replaced by NaiToSymbol from @hive/ui

export const DEFAULT_OBSERVER = commonVariables.defaultObserver;
/** The sort of the For You feed (`/for-you`), served by haf_fyp rather than the bridge API. */
export const FOR_YOU_SORT = 'for-you';
/** Whether the For You feed is on: FYP_API_URL is set. */
export const isForYouEnabled = configuredFypApiUrl !== undefined;
export type SortTypes = 'trending' | 'hot' | 'created' | 'payout' | 'muted' | typeof FOR_YOU_SORT;

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

export type sortTypes = SortTypes;
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
    case FOR_YOU_SORT:
      return 'For You';
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

export function amt(string_amount: string) {
  return parsePayoutAmount(string_amount);
}

export function parsePayoutAmount(amount: string) {
  return parseFloat(String(amount).replace(/\s[A-Z]*$/, ''));
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

/** The images.hive.blog image URLs among `urls`, unproxied. */
export function extractPictureFromPostBody(urls: string[]): string[] {
  const picturesFromPostBody: string[] = [];
  for (const url of urls) {
    const picture = matchHiveBlogImageUrl(url);
    if (picture) {
      picturesFromPostBody.push(picture);
    }
  }

  return picturesFromPostBody;
}

/** Time left until `date`, e.g. "15 hours and 50 minutes"; empty once it has passed. */
export function hoursAndMinutes(date: Date, t: TFunction<'common_blog', undefined>) {
  const today = dayjs();
  const cooldownMin = dayjs(date).diff(today, 'minute') % 60;
  const cooldownH = dayjs(date).diff(today, 'hour');
  const hoursText = cooldownH > 0 ? t('global.time.hours_count', { count: cooldownH }) : '';
  const minutesText = cooldownMin > 0 ? t('global.time.minutes_count', { count: cooldownMin }) : '';
  if (hoursText && minutesText) {
    return t('global.time.hours_and_minutes', { hours: hoursText, minutes: minutesText });
  }
  return hoursText || minutesText;
}

/** The account's unclaimed rewards as one list in `locale` ("1.000 HIVE, 2.000 HBD and 3.000 HP"), or that there are none. */
export function getRewardsString(account: FullAccount, t: TFunction<'common_blog', undefined>, locale: string): string {
  const rewards = [
    account.reward_hive_balance,
    account.reward_hbd_balance,
    account.reward_vesting_hive
  ].filter((asset) => BigInt(asset.amount) > BigInt(0));
  if (rewards.length === 0) return t('global.no_rewards');
  return formatList(
    rewards.map((asset) =>
      asset === account.reward_vesting_hive
        ? `${formatAsset(asset, { appendTokenName: false, locale })} HP`
        : formatAsset(asset, { locale })
    ),
    locale
  );
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
        is_pinned: discussion[key].stats?.is_pinned ?? false,
        muted_reasons: discussion[key].stats?.muted_reasons
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

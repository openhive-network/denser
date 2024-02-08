import { SMTAsset } from '@hiveio/dhive/lib/chain/asset';
import Big from 'big.js';
import { ClassValue, clsx } from 'clsx';
import sanitize from 'sanitize-html';
import { twMerge } from 'tailwind-merge';
import remarkableStripper from '@/blog/lib/remmarkable-stripper';
import { Vote } from './hive';
import { Entry, JsonMetadata } from '@ui/lib/bridge';
import { parseDate2 } from '@hive/ui/lib/parse-date';

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

export function getPostSummary(jsonMetadata: JsonMetadata, body: string, stripQuotes = false) {
  const shortDescription = jsonMetadata?.description;

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

export const prepareVotes = (entry: Entry, votes: Vote[]) => {
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

export function extractUrlsFromJsonString(jsonString: string): string[] {
  const urlRegex = /((?:https?:\/\/|www\.)[^\s]+)/g;
  const matches = jsonString.match(urlRegex);
  return matches || [];
}

export function extractYouTubeVideoIds(urls: string[]): string[] {
  const youtubeLinkRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/)?([a-zA-Z0-9_-]+)/i;

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

export function parseCookie(cookie: string): Record<string, string> {
  const kv: Record<string, string> = {};

  if (!cookie) return kv;

  cookie.split(';').forEach((part) => {
    const [k, v] = part.split('=');
    kv[k] = v;
  });

  return kv;
}

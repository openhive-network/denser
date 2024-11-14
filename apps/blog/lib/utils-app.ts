import moment from 'moment';
import { TFunction } from 'i18next';
import type { Entry } from '@transaction/lib/bridge';
import { parseAsset } from '@ui/lib/utils';
import { FullAccount } from '@ui/store/app-types';

export function hoursAndMinutes(date: Date, t: TFunction<'common_blog', undefined>) {
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

export enum SortOrder {
  trending = 'trending',
  votes = 'votes',
  new = 'new'
}

export const sorter = (discussion: Entry[], order: SortOrder) => {
  const allPayout = (c: Entry) =>
    parseAsset(c.pending_payout_value).amount +
    parseAsset(c.author_payout_value).amount +
    parseAsset(c.curator_payout_value).amount;

  const demote = (a: Entry) => a.stats?.gray;
  const upvotes = (a: Entry) => a.active_votes.filter((v) => v.rshares != 0).length;
  const sortOrders = {
    trending: (a: Entry, b: Entry) => {
      const apayout = allPayout(a);
      const bpayout = allPayout(b);
      if (demote(a) != demote(b)) return demote(a) ? 1 : -1;

      if (apayout !== bpayout) {
        return bpayout - apayout;
      }
      return b.net_rshares - a.net_rshares;
    },
    votes: (a: Entry, b: Entry) => {
      return upvotes(b) - upvotes(a);
    },
    new: (a: Entry, b: Entry) => {
      const keyA = Date.parse(a.created);
      const keyB = Date.parse(b.created);

      if (demote(a) != demote(b)) return demote(a) ? 1 : -1;

      return keyB - keyA;
    }
  };

  discussion.sort(sortOrders[order]);
};

export function netVests(account: FullAccount) {
  const vests = parseFloat(account.vesting_shares);
  const delegated = parseFloat(account.delegated_vesting_shares);
  const received = parseFloat(account.received_vesting_shares);
  return vests - delegated + received;
}

export function amt(string_amount: string) {
  return parsePayoutAmount(string_amount);
}

export function parsePayoutAmount(amount: string) {
  return parseFloat(String(amount).replace(/\s[A-Z]*$/, ''));
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

export function fmt(decimal_amount: number | string, asset = null) {
  return formatDecimal(Number(decimal_amount)).join('') + (asset ? ' ' + asset : '');
}

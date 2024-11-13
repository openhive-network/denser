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

import { Entry } from '@transaction/lib/extended-hive.chain'; 
import { parseAsset } from '@ui/lib/utils';

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

export default sorter;

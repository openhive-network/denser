import { Entry } from '@hive/common-hiveio-packages/wax'; 
import { parseAsset } from '@ui/lib/utils';

export enum SortOrder {
  trending = 'trending',
  votes = 'votes',
  new = 'new'
}

/** The number of votes of weight (non-zero rshares) on each post of a discussion, by `author/permlink`. */
export type UpvoteCounts = Record<string, number>;

const upvotesOf = (entry: Entry) => entry.active_votes?.filter((v) => v.rshares != 0).length ?? 0;

/** The upvote counts of a discussion read with its votes. */
export const countUpvotes = (discussion: Record<string, Entry>): UpvoteCounts =>
  Object.fromEntries(Object.values(discussion).map((entry) => [`${entry.author}/${entry.permlink}`, upvotesOf(entry)]));

/** Whether a discussion was read without votes, so that sorting it by votes needs `UpvoteCounts`. */
export const isVoteFreeDiscussion = (discussion: Record<string, Entry>): boolean =>
  Object.values(discussion).some((entry) => !entry.active_votes);

/**
 * Sorts `discussion` in place. The votes order counts votes of weight: an entry's `active_votes`,
 * else its count in `upvoteCounts`, else (a vote-free entry with no count yet) `stats.total_votes`.
 */
export const sorter = (discussion: Entry[], order: SortOrder, upvoteCounts?: UpvoteCounts) => {
  const allPayout = (c: Entry) =>
    parseAsset(c.pending_payout_value).amount +
    parseAsset(c.author_payout_value).amount +
    parseAsset(c.curator_payout_value).amount;

  const demote = (a: Entry) => a.stats?.gray;
  const upvotes = (a: Entry) =>
    a.active_votes
      ? upvotesOf(a)
      : (upvoteCounts?.[`${a.author}/${a.permlink}`] ?? a.stats?.total_votes ?? 0);
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

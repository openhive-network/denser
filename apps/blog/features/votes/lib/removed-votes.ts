import type { Entry } from '@hive/common-hiveio-packages/wax';

interface IListedVote {
  rshares: number;
  percent?: number;
}

type TCountedEntry = Pick<Entry, 'stats' | 'active_votes' | 'observer_vote'> & Partial<Pick<Entry, 'is_paidout'>>;

/**
 * Whether `vote` is a removed vote: the chain keeps an unvote as a vote of 0%, and every API still
 * lists and counts it. Judged by the percent where the API gives it, else by rshares, so a vote
 * listed with only rshares that carried none (dust, or no voting mana) reads as removed too.
 */
export const isRemovedVote = (vote: IListedVote): boolean =>
  vote.percent !== undefined ? vote.percent === 0 : vote.rshares === 0;

/** `votes` without the removed ones (see `isRemovedVote`); downvotes stay. */
export const keepCastVotes = <T extends IListedVote>(votes: T[]): T[] =>
  votes.filter((vote) => !isRemovedVote(vote));

/**
 * The votes of `entry` to show as its count: `stats.total_votes` less the removed votes the entry
 * lists. A full `active_votes` list makes it exact. A vote-free entry lists none but the observer's
 * own (`observer_vote`), so only that one can be taken off (see `countObserverRemovedVote`); the rest
 * of the count stays as the node gives it.
 */
export function castVoteCount(entry: TCountedEntry): number {
  const totalVotes = entry.stats?.total_votes ?? 0;
  const removedVotes = entry.active_votes
    ? countListedRemovedVotes(entry.active_votes, totalVotes)
    : countObserverRemovedVote(entry);
  return Math.max(0, totalVotes - removedVotes);
}

/**
 * 1 when the observer's removed vote is one `total_votes` counts, else 0. Only a vote cast before
 * the payout is counted. `observer_vote` carries no time, and a vote cast after payout is 0/0 too,
 * so on a paid-out entry the two cannot be told apart and the vote is left in the count, which is
 * then the one every other reader of the entry sees. On an entry not yet paid out every vote was
 * cast before the payout.
 */
function countObserverRemovedVote({ observer_vote: observerVote, is_paidout: isPaidOut }: TCountedEntry): number {
  return observerVote && isRemovedVote(observerVote) && !isPaidOut ? 1 : 0;
}

/**
 * The removed votes of `activeVotes` that `totalVotes` counts. A vote cast after payout is listed
 * with 0 rshares too, but `total_votes` leaves it out, so the votes listed beyond the total are
 * taken as such late votes rather than as removed ones.
 */
function countListedRemovedVotes(activeVotes: IListedVote[], totalVotes: number): number {
  const votesAfterPayout = Math.max(0, activeVotes.length - totalVotes);
  return Math.max(0, activeVotes.filter(isRemovedVote).length - votesAfterPayout);
}

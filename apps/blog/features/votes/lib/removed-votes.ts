import type { Entry } from '@hive/common-hiveio-packages/wax';

interface IListedVote {
  rshares: number;
  percent?: number;
}

type TCountedEntry = Pick<Entry, 'stats' | 'active_votes' | 'observer_vote'> &
  Partial<Pick<Entry, 'is_paidout' | 'payout_at'>>;

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
 * of the count stays as the node gives it. `removedVoteTime` is the chain time of that removed vote,
 * where it has been read (see `needsRemovedVoteTime`).
 */
export function castVoteCount(entry: TCountedEntry, removedVoteTime?: string): number {
  const totalVotes = entry.stats?.total_votes ?? 0;
  const removedVotes = entry.active_votes
    ? countListedRemovedVotes(entry.active_votes, totalVotes)
    : countObserverRemovedVote(entry, removedVoteTime);
  return Math.max(0, totalVotes - removedVotes);
}

/**
 * Whether `castVoteCount` needs the time of the observer's removed vote to count `entry`: a paid-out
 * vote-free entry whose `observer_vote` is removed. `observer_vote` carries no time, and on such an
 * entry a vote removed before the payout is in `total_votes` while one cast after it is not.
 */
export const needsRemovedVoteTime = (entry: TCountedEntry): boolean =>
  !entry.active_votes &&
  Boolean(entry.is_paidout) &&
  Boolean(entry.observer_vote && isRemovedVote(entry.observer_vote));

/**
 * 1 when the observer's removed vote is one `total_votes` counts, else 0. Only a vote cast before
 * the payout is counted. On an entry not yet paid out every vote was cast before the payout. On a
 * paid-out entry it is judged by `removedVoteTime`, the vote's last change: a removed vote changed
 * before `payout_at` was cast before it. Without that time the vote is left in the count, which is
 * then the one every other reader of the entry sees.
 */
function countObserverRemovedVote(
  { observer_vote: observerVote, is_paidout: isPaidOut, payout_at: payoutAt }: TCountedEntry,
  removedVoteTime: string | undefined
): number {
  if (!observerVote || !isRemovedVote(observerVote)) return 0;
  if (!isPaidOut) return 1;
  return removedVoteTime && payoutAt && isBefore(removedVoteTime, payoutAt) ? 1 : 0;
}

/** Whether chain UTC time `time` (no zone suffix) is before `other`; false if either is unreadable. */
const isBefore = (time: string, other: string): boolean => Date.parse(`${time}Z`) < Date.parse(`${other}Z`);

/**
 * The removed votes of `activeVotes` that `totalVotes` counts. A vote cast after payout is listed
 * with 0 rshares too, but `total_votes` leaves it out, so the votes listed beyond the total are
 * taken as such late votes rather than as removed ones.
 */
function countListedRemovedVotes(activeVotes: IListedVote[], totalVotes: number): number {
  const votesAfterPayout = Math.max(0, activeVotes.length - totalVotes);
  return Math.max(0, activeVotes.filter(isRemovedVote).length - votesAfterPayout);
}

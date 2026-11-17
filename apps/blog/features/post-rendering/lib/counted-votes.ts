import { keepCastVotes } from '../../votes/lib/removed-votes.ts';
import { keepVotesBeforePayout } from './votes-before-payout.ts';

interface IListedVoterVote {
  voter: string;
  rshares: number;
  percent?: number;
  time: string;
}

/**
 * The votes of a full vote list that count: cast (see `keepCastVotes`) before the payout (see
 * `keepVotesBeforePayout`). The voters list shows these.
 */
export function keepCountedVotes<T extends IListedVoterVote>(votes: T[], payoutAt: string): T[] {
  return keepCastVotes(keepVotesBeforePayout(votes, payoutAt));
}

/**
 * The number of voters among `keepCountedVotes`, the count to label a loaded vote list with.
 * Voters are counted once because `list_votes` pages repeat the voter a page starts from.
 */
export function countCountedVotes(votes: IListedVoterVote[], payoutAt: string): number {
  return new Set(keepCountedVotes(votes, payoutAt).map((vote) => vote.voter)).size;
}

import { keepCastVotes } from '../../votes/lib/removed-votes.ts';
import { keepVotesAfterPayout } from './votes-before-payout.ts';

interface IVoterVote {
  voter: string;
  rshares: number;
  percent?: number;
  time: string;
}

/**
 * Counts the votes on chain cast after the payout (see `keepVotesAfterPayout`), which have no
 * effect and which hivemind leaves out of `stats.total_votes`. Removed votes (see `keepCastVotes`)
 * are not votes cast, so they never count, wherever they fall. Voters are counted once because
 * `list_votes` pages repeat the voter a page starts from.
 */
export function countVotesAfterPayout(chainVotes: IVoterVote[], payoutAt: string): number {
  const lateVotes = keepCastVotes(keepVotesAfterPayout(chainVotes, payoutAt));
  return new Set(lateVotes.map((vote) => vote.voter)).size;
}

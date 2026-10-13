interface IVoterVote {
  voter: string;
}

/**
 * Counts the votes on chain that hivemind leaves out of `stats.total_votes`: the ones cast after
 * the payout window. No API reports per vote whether it counted, so this is the difference between
 * the chain's vote list and `total_votes`, never below 0. Voters are counted once because
 * `list_votes` pages repeat the voter a page starts from.
 */
export function countVotesAfterPayout(chainVotes: IVoterVote[], totalVotes: number): number {
  const chainVoteCount = new Set(chainVotes.map((vote) => vote.voter)).size;
  return Math.max(0, chainVoteCount - totalVotes);
}

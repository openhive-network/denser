/**
 * Counts the votes on chain that hivemind leaves out of `stats.total_votes`: the votes cast, or
 * changed, after the payout window. Subtracting the counts is exact where comparing timestamps
 * is not, because a vote cast in the window and changed after payout carries the late time.
 * Returns 0 when the total is unknown or not smaller than the number of votes on chain.
 */
export function countVotesAfterPayout(chainVoteCount: number, totalVotes: number | undefined): number {
  if (totalVotes === undefined) return 0;
  return Math.max(0, chainVoteCount - totalVotes);
}

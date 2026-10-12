interface ITimedVote {
  time: string;
}

/**
 * Keeps the votes cast before the payout time, the ones hivemind counts in `stats.total_votes`.
 * A vote cast after payout stays on chain but has no effect, so listing it would disagree with
 * the vote count. Both timestamps are chain UTC times without a zone suffix.
 */
export function keepVotesBeforePayout<T extends ITimedVote>(votes: T[], payoutAt: string): T[] {
  const payoutTime = Date.parse(`${payoutAt}Z`);
  if (Number.isNaN(payoutTime)) return votes;
  return votes.filter((vote) => Date.parse(`${vote.time}Z`) <= payoutTime);
}

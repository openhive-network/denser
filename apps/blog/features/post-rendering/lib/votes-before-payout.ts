interface ITimedVote {
  time: string;
  rshares: number;
}

/**
 * Whether `vote` was cast after the payout: listed after `payoutTime` with no rshares. A vote cast
 * before the payout and changed after it is listed at its change time but keeps the rshares it
 * counted with. Both timestamps are chain UTC times without a zone suffix.
 */
const isCastAfterPayout = (vote: ITimedVote, payoutTime: number): boolean =>
  vote.rshares === 0 && Date.parse(`${vote.time}Z`) > payoutTime;

/**
 * Keeps the votes cast before the payout time, the ones hivemind counts in `stats.total_votes`.
 * A vote cast after payout stays on chain but has no effect, so listing it would disagree with
 * the vote count. With no known payout time every vote is kept.
 */
export function keepVotesBeforePayout<T extends ITimedVote>(votes: T[], payoutAt: string): T[] {
  const payoutTime = Date.parse(`${payoutAt}Z`);
  if (Number.isNaN(payoutTime)) return votes;
  return votes.filter((vote) => !isCastAfterPayout(vote, payoutTime));
}

/** The votes `keepVotesBeforePayout` leaves out; none with no known payout time. */
export function keepVotesAfterPayout<T extends ITimedVote>(votes: T[], payoutAt: string): T[] {
  const payoutTime = Date.parse(`${payoutAt}Z`);
  if (Number.isNaN(payoutTime)) return [];
  return votes.filter((vote) => isCastAfterPayout(vote, payoutTime));
}

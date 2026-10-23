// The DHF account since HF24: hived's database::get_treasury_name() returns
// NEW_HIVE_TREASURY_ACCOUNT (hive/protocol/config.hpp) from then on.
export const DHF_ACCOUNT = 'hive.fund';
export const HBD_STABILIZER_ACCOUNT = 'hbdstabilizer';
/** The base return proposal: it pays the DHF back, so proposals ranked below it are not funded. */
export const RETURN_PROPOSAL_ID = 0;

// sps_processor::calculate_maintenance_budget (libraries/chain/sps_processor.cpp): a day's budget is
// the DHF's HBD balance divided by total_amount_divider.
const DAILY_BUDGET_DIVIDER = BigInt(100);
const ZERO = BigInt(0);

/** The `database_api.list_proposals` fields the payout rule reads. */
export interface FundingCandidate {
  proposal_id: number;
  receiver: string;
  status: string;
  total_votes: string;
  daily_pay: { amount: string };
}

export interface FundingRound {
  /** HBD satoshis each proposal receives in the next day of payouts; proposals paid nothing are absent. */
  payouts: ReadonlyMap<number, bigint>;
  /** HBD satoshis a day paid to proposals other than return proposals and the HBD stabilizer. */
  dailyFunded: bigint;
  /** HBD satoshis a day paid to the HBD stabilizer's proposals. */
  stabilizerFunded: bigint;
}

/** HBD satoshis the DHF can pay out in a day, given its HBD balance in satoshis. */
export const maxDailyBudget = (dhfHbdBalance: bigint): bigint => dhfHbdBalance / DAILY_BUDGET_DIVIDER;

// sps_processor::sort_by_votes: most votes first, the older proposal first on a tie.
const byVotesThenId = (a: FundingCandidate, b: FundingCandidate): number => {
  const votesA = BigInt(a.total_votes);
  const votesB = BigInt(b.total_votes);
  if (votesA !== votesB) return votesA > votesB ? -1 : 1;
  return a.proposal_id - b.proposal_id;
};

/**
 * The next round of DHF payouts, as hived's sps_processor::transfer_payments makes them for a full
 * day: active proposals in vote order each take their daily pay, the one that exhausts `dailyBudget`
 * takes what is left, and the rest get nothing; a proposal without votes ends the round.
 * `returnAccounts` are the receivers whose pay goes back to the DHF.
 */
export function computeFundingRound(
  proposals: readonly FundingCandidate[],
  dailyBudget: bigint,
  returnAccounts: readonly string[]
): FundingRound {
  const payouts = new Map<number, bigint>();
  let dailyFunded = ZERO;
  let stabilizerFunded = ZERO;
  let budget = dailyBudget;
  const active = proposals.filter((proposal) => proposal.status === 'active').sort(byVotesThenId);

  for (const proposal of active) {
    if (budget <= ZERO || BigInt(proposal.total_votes) === ZERO) break;
    const dailyPay = BigInt(proposal.daily_pay.amount);
    const paid = dailyPay < budget ? dailyPay : budget;
    budget -= paid;
    payouts.set(proposal.proposal_id, paid);
    if (proposal.receiver === HBD_STABILIZER_ACCOUNT) stabilizerFunded += paid;
    else if (!returnAccounts.includes(proposal.receiver)) dailyFunded += paid;
  }
  return { payouts, dailyFunded, stabilizerFunded };
}

/** Whether `proposal` is the base return proposal. */
export const isReturnProposal = (
  proposal: Pick<FundingCandidate, 'proposal_id' | 'receiver'>,
  returnAccounts: readonly string[]
): boolean => proposal.proposal_id === RETURN_PROPOSAL_ID && returnAccounts.includes(proposal.receiver);

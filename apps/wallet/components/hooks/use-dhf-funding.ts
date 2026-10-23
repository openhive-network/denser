import { useQuery } from '@tanstack/react-query';
import { getAccounts } from '@transaction/lib/hive-api';
import { getProposals } from '@/wallet/lib/hive';
import { REFUND_ACCOUNTS } from '@/wallet/lib/constants';
import {
  DHF_ACCOUNT,
  computeFundingRound,
  maxDailyBudget,
  type FundingRound
} from '@/wallet/lib/dhf-funding';

// database_api's single-query limit (DATABASE_API_SINGLE_QUERY_LIMIT); far more than the active proposals.
const ACTIVE_PROPOSALS_LIMIT = 1000;

export interface DhfFunding extends FundingRound {
  /** The DHF's HBD balance, in satoshis. */
  totalBudget: bigint;
  /** What the DHF can pay out in a day, in HBD satoshis. */
  dailyBudget: bigint;
}

async function getDhfFunding(): Promise<DhfFunding> {
  const [proposals, [dhf]] = await Promise.all([
    getProposals({
      status: 'active',
      order: 'by_total_votes',
      order_direction: 'descending',
      limit: ACTIVE_PROPOSALS_LIMIT
    }),
    getAccounts([DHF_ACCOUNT])
  ]);
  if (!dhf) throw new Error(`The DHF account ${DHF_ACCOUNT} was not found`);
  const totalBudget = BigInt(dhf.hbd_balance.amount);
  const dailyBudget = maxDailyBudget(totalBudget);
  return { totalBudget, dailyBudget, ...computeFundingRound(proposals, dailyBudget, REFUND_ACCOUNTS) };
}

/** The DHF's budget and the proposals it pays in the next round of payouts. */
export const useDhfFundingQuery = () =>
  useQuery({
    queryKey: ['dhfFunding'],
    queryFn: getDhfFunding
  });

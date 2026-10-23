import Big from 'big.js';
import type { QueryObserverResult } from '@tanstack/react-query';

/** balance-api's limit on the proposal ids of one proposal payments call. */
export const PROPOSAL_PAYMENTS_BATCH_SIZE = 1000;

// The DHF pays proposals once an hour, so a total is good for that long.
const PROPOSAL_PAID_STALE_TIME_MS = 60 * 60 * 1000;

/** The fields of balance-api's proposal payment totals the list uses. */
export interface ProposalPaymentTotal {
  proposal_id: number;
  /** HBD, `amount` in satoshis */
  total_paid: { amount: string; precision: number };
}

export interface ProposalPaid {
  proposalId: number;
  /** HBD paid so far */
  paid: Big;
}

export type FetchProposalPayments = (proposalIds: number[]) => Promise<ProposalPaymentTotal[]>;
export type LoadProposalPaid = (proposalId: number) => Promise<ProposalPaid>;

interface PendingLoad {
  resolve: (paid: ProposalPaid) => void;
  reject: (error: unknown) => void;
}

const toBatches = (ids: number[]): number[][] => {
  const batches: number[][] = [];
  for (let start = 0; start < ids.length; start += PROPOSAL_PAYMENTS_BATCH_SIZE) {
    batches.push(ids.slice(start, start + PROPOSAL_PAYMENTS_BATCH_SIZE));
  }
  return batches;
};

const settleBatch = async (
  fetchPayments: FetchProposalPayments,
  ids: number[],
  pending: ReadonlyMap<number, PendingLoad[]>
): Promise<void> => {
  const loadsOf = (id: number) => pending.get(id) ?? [];
  try {
    const totals = new Map((await fetchPayments(ids)).map((total) => [total.proposal_id, total.total_paid]));
    for (const id of ids) {
      const total = totals.get(id);
      const outcome = total
        ? { proposalId: id, paid: new Big(total.amount).div(new Big(10).pow(total.precision)) }
        : undefined;
      for (const load of loadsOf(id)) {
        if (outcome) load.resolve(outcome);
        else load.reject(new Error(`balance-api left proposal #${id} out of its payments`));
      }
    }
  } catch (error) {
    for (const id of ids) loadsOf(id).forEach((load) => load.reject(error));
  }
};

/**
 * Collects the proposal ids asked for within one turn of the event loop and fetches them with
 * `fetchPayments` in as few calls of at most PROPOSAL_PAYMENTS_BATCH_SIZE distinct ids as it takes.
 * Each load resolves with the HBD paid to its proposal, or rejects with its call's error (or when
 * the answer leaves its id out).
 */
export function createProposalPaidLoader(fetchPayments: FetchProposalPayments): LoadProposalPaid {
  let pending = new Map<number, PendingLoad[]>();
  const flush = () => {
    const loads = pending;
    pending = new Map();
    for (const ids of toBatches([...loads.keys()])) void settleBatch(fetchPayments, ids, loads);
  };
  return (proposalId) =>
    new Promise<ProposalPaid>((resolve, reject) => {
      if (pending.size === 0) setTimeout(flush, 0);
      pending.set(proposalId, [...(pending.get(proposalId) ?? []), { resolve, reject }]);
    });
}

/**
 * The query of one proposal's paid total, cached per id: ids asked for together share one call
 * through `load`. Not retried: a node without the endpoint answers the same the next time.
 */
export const proposalPaidQuery = (proposalId: number, load: LoadProposalPaid) => ({
  queryKey: ['proposalPaid', proposalId] as const,
  queryFn: () => load(proposalId),
  staleTime: PROPOSAL_PAID_STALE_TIME_MS,
  retry: false
});

/** The paid totals of the queries that have one, by proposal id. */
export const paidByProposalId = (
  results: readonly Pick<QueryObserverResult<ProposalPaid>, 'data'>[]
): ReadonlyMap<number, Big> =>
  new Map(results.flatMap(({ data }) => (data ? [[data.proposalId, data.paid] as const] : [])));

const STATUSES_TO_PAY = new Set(['active', 'inactive']);

/**
 * What is left of an active or upcoming (`inactive`) proposal's lifetime maximum, `dailyPay` HBD
 * over `totalDays`, once `paid` is taken off; never below 0. Undefined for an expired proposal.
 */
export const proposalToPay = (status: string, dailyPay: Big, totalDays: number, paid: Big): Big | undefined => {
  if (!STATUSES_TO_PAY.has(status)) return undefined;
  const left = dailyPay.times(totalDays).minus(paid);
  return left.gt(0) ? left : new Big(0);
};

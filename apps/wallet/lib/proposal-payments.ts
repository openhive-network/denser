import Big from 'big.js';
import type { QueryObserverResult } from '@tanstack/react-query';

/** balance-api's limit on the proposal ids of one proposal payments call. */
export const PROPOSAL_PAYMENTS_BATCH_SIZE = 1000;

// The DHF pays proposals once an hour, so a total is good for that long.
const PROPOSAL_PAID_STALE_TIME_MS = 60 * 60 * 1000;

const HOUR_MS = 60 * 60 * 1000;
const HOURS_PER_DAY = 24;
const DAY_MS = HOURS_PER_DAY * HOUR_MS;
// The DHF pays every hour: a proposal not paid for longer than this is not funded at the moment.
const CURRENTLY_UNFUNDED_AFTER_MS = 2 * HOUR_MS;

/** The fields of balance-api's proposal payment totals the list uses. */
export interface ProposalPaymentTotal {
  proposal_id: number;
  /** HBD, `amount` in satoshis */
  total_paid: { amount: string; precision: number };
  /** Hourly payments received, the hours the proposal was funded */
  payment_count: number;
  /** Hive API timestamp (UTC without a zone designator) of the last payment; null if never paid */
  last_payment_time: string | null;
}

export interface ProposalPaid {
  proposalId: number;
  /** HBD paid so far */
  paid: Big;
  /** Hours the proposal was paid for */
  paymentCount: number;
  /** Hive API timestamp of the last payment; null if never paid */
  lastPaymentTime: string | null;
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
    const totals = new Map((await fetchPayments(ids)).map((total) => [total.proposal_id, total]));
    for (const id of ids) {
      const total = totals.get(id);
      const outcome: ProposalPaid | undefined = total
        ? {
            proposalId: id,
            paid: new Big(total.total_paid.amount).div(new Big(10).pow(total.total_paid.precision)),
            paymentCount: total.payment_count,
            lastPaymentTime: total.last_payment_time
          }
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
 * Each load resolves with what its proposal was paid, or rejects with its call's error (or when
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

/** The payments of the queries that have them, by proposal id. */
export const paidByProposalId = (
  results: readonly Pick<QueryObserverResult<ProposalPaid>, 'data'>[]
): ReadonlyMap<number, ProposalPaid> =>
  new Map(results.flatMap(({ data }) => (data ? [[data.proposalId, data] as const] : [])));

/** The fields of a listed proposal the payment figures are worked out from. */
export interface ProposalTerms {
  status: string;
  /** Hive API timestamps (UTC without a zone designator) */
  start_date: string;
  end_date: string;
  /** HBD a day */
  daily_pay: { amount: Big };
}

export interface ProposalUnfunded {
  /** HBD the proposal would have had if funded every hour since it started, less what it was paid */
  amount: Big;
  /** Days it was not paid for, rounded; 0 when it never was (see `neverFunded`) */
  days: number;
  neverFunded: boolean;
}

const hiveTime = (timestamp: string): number => Date.parse(`${timestamp}Z`);

const STATUSES_RUN = new Set(['active', 'expired']);

/**
 * What an active or expired proposal was not paid: its daily pay for each whole hour from its start to
 * `now` (ms since the epoch) or its end, whichever is first, less `paid`, never below 0; and those
 * hours less the `paymentCount` it was paid for, in days. The amount also counts the part of an hour
 * a proposal gets when the DHF runs out of its daily budget on it. Undefined for a proposal that
 * has not started.
 */
export const proposalUnfunded = (
  terms: ProposalTerms,
  { paid, paymentCount }: Pick<ProposalPaid, 'paid' | 'paymentCount'>,
  now: number
): ProposalUnfunded | undefined => {
  const start = hiveTime(terms.start_date);
  if (!STATUSES_RUN.has(terms.status) || now < start) return undefined;
  const elapsedHours = Math.floor((Math.min(now, hiveTime(terms.end_date)) - start) / HOUR_MS);
  const owed = terms.daily_pay.amount.times(elapsedHours).div(HOURS_PER_DAY).minus(paid);
  return {
    amount: owed.gt(0) ? owed : new Big(0),
    days: Math.max(0, Math.round((elapsedHours - paymentCount) / HOURS_PER_DAY)),
    neverFunded: paymentCount === 0
  };
};

/**
 * The most an active proposal can still receive: its daily pay for the time from `now` to its end.
 * Undefined for a proposal that is not active.
 */
export const proposalUpToLeft = (terms: ProposalTerms, now: number): Big | undefined => {
  if (terms.status !== 'active') return undefined;
  const remainingMs = Math.max(0, hiveTime(terms.end_date) - now);
  return terms.daily_pay.amount.times(remainingMs).div(DAY_MS);
};

/**
 * When an active proposal not paid in the last couple of hours, so not funded at the moment, was
 * last paid, as ms since the epoch. Undefined while it is paid, when it never was, or when it is
 * not active.
 */
export const proposalLastPaidWhileUnfunded = (
  status: string,
  lastPaymentTime: string | null,
  now: number
): number | undefined => {
  if (status !== 'active' || !lastPaymentTime) return undefined;
  const lastPaid = hiveTime(lastPaymentTime);
  return now - lastPaid > CURRENTLY_UNFUNDED_AFTER_MS ? lastPaid : undefined;
};

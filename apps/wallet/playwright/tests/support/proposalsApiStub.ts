import type { JsonRpcResults, RestResults } from './apiStub';
import {
  PROPOSALS_PAYMENTS_PATH,
  STUB_ACCOUNT,
  fullAccount,
  stubProposalsPayments,
  type StubProposalPayments
} from './walletApiStub';

/**
 * A proposals page with a DHF to fund it, for `startWalletApiStub`'s `jsonRpc`: seven proposals,
 * which `database_api.list_proposals` filters by status and orders, from the start up to `limit`, and a DHF holding DHF_STUB_HBD. With a daily budget of 500 HBD the next round
 * pays #11 (200 HBD), the stabilizer's #12 (150 HBD) and the return proposal #0 (the remaining
 * 150 HBD), and nothing below.
 */

const hbd = (amount: string) => ({ amount, precision: 3, nai: '@@000000013' });

/** The DHF's HBD balance, 50,000.000 HBD in satoshis. */
export const DHF_STUB_HBD = '50000000';
/** The proposal ids in vote order, with what each one is. */
export const STUB_PROPOSALS = {
  funded: 11,
  stabilizer: 12,
  returnProposal: 0,
  belowLine: 13,
  upcoming: 14,
  expired: 15,
  burn: 16
} as const;

const proposal = (
  id: number,
  totalVotes: string,
  dailyPay: string,
  fields: {
    subject: string;
    creator: string;
    receiver?: string;
    status?: string;
    start?: string;
    end?: string;
  }
) => ({
  id,
  proposal_id: id,
  creator: fields.creator,
  receiver: fields.receiver ?? fields.creator,
  start_date: fields.start ?? '2026-01-01T00:00:00',
  end_date: fields.end ?? '2026-12-31T00:00:00',
  daily_pay: hbd(dailyPay),
  subject: fields.subject,
  permlink: `stub-proposal-${id}`,
  total_votes: totalVotes,
  status: fields.status ?? 'active'
});

type StubProposal = ReturnType<typeof proposal>;

const PROPOSALS: StubProposal[] = [
  proposal(STUB_PROPOSALS.funded, '90000000000000000', '200000', {
    subject: 'Core development',
    creator: STUB_ACCOUNT
  }),
  proposal(STUB_PROPOSALS.stabilizer, '80000000000000000', '150000', {
    subject: 'HBD stabilizer',
    creator: 'stub-alice',
    receiver: 'hbdstabilizer'
  }),
  proposal(STUB_PROPOSALS.returnProposal, '70000000000000000', '240000000000', {
    subject: 'Return Proposal',
    creator: 'hive.fund',
    start: '2019-08-31T00:00:00',
    end: '2029-12-31T00:00:00'
  }),
  proposal(STUB_PROPOSALS.belowLine, '60000000000000000', '50000', {
    subject: 'Community tools',
    creator: 'stub-bob'
  }),
  proposal(STUB_PROPOSALS.upcoming, '50000000000000000', '10000', {
    subject: 'Upcoming work',
    creator: 'stub-carol',
    status: 'inactive',
    start: '2027-01-01T00:00:00',
    end: '2027-06-01T00:00:00'
  }),
  proposal(STUB_PROPOSALS.expired, '40000000000000000', '10000', {
    subject: 'Finished work',
    creator: 'stub-dave',
    status: 'expired',
    start: '2025-01-01T00:00:00',
    end: '2025-06-01T00:00:00'
  }),
  proposal(STUB_PROPOSALS.burn, '10000000000000000', '5000', {
    subject: 'Burn proposal',
    creator: 'stub-erin',
    receiver: 'null'
  })
];

const STATUSES_BY_FILTER: Record<string, string[]> = {
  all: ['active', 'inactive', 'expired'],
  votable: ['active', 'inactive'],
  active: ['active'],
  inactive: ['inactive'],
  expired: ['expired']
};

const param = (params: object, name: string): unknown =>
  Object.entries(params).find(([key]) => key === name)?.[1];

const stringParam = (params: object, name: string, fallback: string): string => {
  const value = param(params, name);
  return typeof value === 'string' ? value : fallback;
};

const numberParam = (params: object, name: string): number | undefined => {
  const value = param(params, name);
  return typeof value === 'number' ? value : undefined;
};

/** STUB_ACCOUNT's vote on the proposal a `by_proposal_voter` listing starts at. */
const listProposalVotes: JsonRpcResults[string] = (params) => {
  const start = param(params, 'start');
  const votedProposal = PROPOSALS.find((item) => Array.isArray(start) && item.proposal_id === start[0]);
  return { proposal_votes: votedProposal ? [{ id: 1, voter: STUB_ACCOUNT, proposal: votedProposal }] : [] };
};

/**
 * The listing from its start, up to `limit`. Like the node, which does not continue a listing from
 * `last_id`, the stub does not page by it: a call without `start` always begins at the top.
 */
const listProposalsOf =
  (all: readonly StubProposal[]): JsonRpcResults[string] =>
  (params) => {
    const statuses = STATUSES_BY_FILTER[stringParam(params, 'status', 'all')] ?? [];
    const order = stringParam(params, 'order', 'by_total_votes');
    const direction = stringParam(params, 'order_direction', 'descending') === 'ascending' ? 1 : -1;
    const sortKey = (item: StubProposal) =>
      order === 'by_creator' ? item.creator : item.total_votes.padStart(20, '0');
    const listing = all
      .filter((item) => statuses.includes(item.status))
      .sort((a, b) => direction * sortKey(a).localeCompare(sortKey(b)));
    return { proposals: listing.slice(0, numberParam(params, 'limit') ?? listing.length) };
  };

const proposalsPageResults = (all: readonly StubProposal[], dhfHbd = DHF_STUB_HBD): JsonRpcResults => ({
  'database_api.list_proposals': listProposalsOf(all),
  'database_api.find_accounts': ({ accounts = [] }) => ({
    accounts: accounts.map((name) =>
      fullAccount(name === 'hive.fund' ? { name, hbd_balance: hbd(dhfHbd) } : { name })
    )
  }),
  'database_api.list_proposal_votes': listProposalVotes
});

export const PROPOSALS_PAGE_RESULTS: JsonRpcResults = proposalsPageResults(PROPOSALS);

/** How many unfunded proposals SEARCH_PAGE_RESULTS adds below the seven, ids from 100 on. */
export const SEARCH_EXTRA_PROPOSALS = 40;
/** The two extra proposals whose subject has "Keychain": one among the votable proposals the list renders first, one past them. */
export const SEARCH_PROPOSALS = {
  onFirstPage: 101,
  pastFirstPage: 100 + SEARCH_EXTRA_PROPOSALS - 1
} as const;
export const SEARCH_TERM = 'keychain';

const SEARCH_SUBJECTS: Record<number, string> = {
  [SEARCH_PROPOSALS.onFirstPage]: 'Keychain for desktop',
  [SEARCH_PROPOSALS.pastFirstPage]: 'Keychain for mobile'
};

const extraProposal = (index: number) => {
  const id = 100 + index;
  return proposal(id, String(1_000_000_000_000_000 - index), '1000', {
    subject: SEARCH_SUBJECTS[id] ?? `Community work ${id}`,
    creator: `stub-worker${id}`
  });
};

/**
 * The proposals page of PROPOSALS_PAGE_RESULTS with SEARCH_EXTRA_PROPOSALS more active proposals
 * below them in vote order, more votable proposals than the list renders at first.
 */
export const SEARCH_PAGE_RESULTS: JsonRpcResults = proposalsPageResults([
  ...PROPOSALS,
  ...Array.from({ length: SEARCH_EXTRA_PROPOSALS }, (_, index) => extraProposal(index))
]);

/**
 * The payments of the proposals that have been paid; every other id has had nothing. #11 was paid
 * 20,200 HBD for 101 of its days and last on 2026-05-30, unfunded since; the expired #15 every hour.
 */
export const STUB_PROPOSALS_PAID: Record<number, StubProposalPayments> = {
  [STUB_PROPOSALS.funded]: {
    amount: '20200000',
    hours: 101 * 24,
    firstPaid: '2026-01-01T01:00:00',
    lastPaid: '2026-05-30T12:00:00'
  },
  [STUB_PROPOSALS.expired]: {
    amount: '1510000',
    hours: 151 * 24,
    firstPaid: '2025-01-01T01:00:00',
    lastPaid: '2025-06-01T00:00:00'
  }
};

/** The proposals page's REST reads, for `startWalletApiStub`'s `rest`. */
export const PROPOSALS_PAGE_REST_RESULTS: RestResults = {
  [PROPOSALS_PAYMENTS_PATH]: stubProposalsPayments(
    STUB_PROPOSALS_PAID,
    (id) => PROPOSALS.find((item) => item.proposal_id === id)?.receiver
  )
};

/**
 * Proposals the size of the live list's, ranked above the seven and paid every hour up to the hour
 * before 2026-06-01: titles longer than a phone's line and money lines with five-character amounts,
 * #392 "651.7K", "41.8K" and "693.5K".
 */
export const REAL_SIZE_PROPOSALS = {
  longest: 392,
  hiveSql: 329,
  development: 373,
  keychain: 348
} as const;

const REAL_SIZE_LAST_PAID = '2026-05-31T23:00:00';

const realSize = (
  id: number,
  totalVotes: string,
  dailyPay: number,
  fields: { subject: string; creator: string; start: string; end: string; paidDays: number }
) => ({
  proposal: proposal(id, totalVotes, String(dailyPay * 1000), fields),
  paid: {
    amount: String(dailyPay * fields.paidDays * 1000),
    hours: fields.paidDays * 24,
    firstPaid: `${fields.start.slice(0, 11)}01:00:00`,
    lastPaid: REAL_SIZE_LAST_PAID
  }
});

const REAL_SIZE = [
  realSize(REAL_SIZE_PROPOSALS.longest, '99000000000000000', 1900, {
    subject: 'Worldmapping 2.0 - Travel Guide, Hive Maps and Rewards for Travel Bloggers',
    creator: 'stub-mapper',
    start: '2025-06-01T00:00:00',
    end: '2027-06-01T00:00:00',
    paidDays: 343
  }),
  realSize(REAL_SIZE_PROPOSALS.hiveSql, '98000000000000000', 1000, {
    subject: 'HiveSQL Proposal - Keep It Free To Use For Everyone Building On Hive',
    creator: 'stub-sql',
    start: '2025-07-01T00:00:00',
    end: '2027-07-01T00:00:00',
    paidDays: 320
  }),
  realSize(REAL_SIZE_PROPOSALS.development, '97000000000000000', 950, {
    subject: 'Hive open source development',
    creator: 'stub-developer',
    start: '2025-12-01T00:00:00',
    end: '2026-11-30T00:00:00',
    paidDays: 170
  }),
  realSize(REAL_SIZE_PROPOSALS.keychain, '96000000000000000', 600, {
    subject: "Keychain - Hive's browser extension and mobile wallet, maintenance",
    creator: 'stub-keychain',
    start: '2025-03-01T00:00:00',
    end: '2027-02-28T00:00:00',
    paidDays: 450
  })
];

/** With a DHF of 1,000,000 HBD, a daily budget of 10,000 HBD, the real-size proposals are all funded. */
const REAL_SIZE_DHF_HBD = '1000000000';
const REAL_SIZE_LISTING = [...REAL_SIZE.map((item) => item.proposal), ...PROPOSALS];

/** PROPOSALS_PAGE_RESULTS with the REAL_SIZE_PROPOSALS ranked above the seven. */
export const REAL_SIZE_PAGE_RESULTS: JsonRpcResults = proposalsPageResults(
  REAL_SIZE_LISTING,
  REAL_SIZE_DHF_HBD
);

/** PROPOSALS_PAGE_REST_RESULTS with the REAL_SIZE_PROPOSALS' payments. */
export const REAL_SIZE_PAGE_REST_RESULTS: RestResults = {
  [PROPOSALS_PAYMENTS_PATH]: stubProposalsPayments(
    { ...STUB_PROPOSALS_PAID, ...Object.fromEntries(REAL_SIZE.map((item) => [item.proposal.id, item.paid])) },
    (id) => REAL_SIZE_LISTING.find((item) => item.proposal_id === id)?.receiver
  )
};

import type { JsonRpcResults, RestResults } from './apiStub';
import { STUB_ACCOUNT, fullAccount } from './walletApiStub';

/**
 * A proposals page with a DHF to fund it, for `startWalletApiStub`'s `jsonRpc`: seven proposals,
 * which `database_api.list_proposals` filters by status and orders as the node does, and a DHF
 * holding DHF_STUB_HBD. With a daily budget of 500 HBD the next round pays #11 (200 HBD), the
 * stabilizer's #12 (150 HBD) and the return proposal #0 (the remaining 150 HBD), and nothing below.
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

const PROPOSALS = [
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

/** STUB_ACCOUNT's vote on the proposal a `by_proposal_voter` listing starts at. */
const listProposalVotes: JsonRpcResults[string] = (params) => {
  const start = param(params, 'start');
  const votedProposal = PROPOSALS.find((item) => Array.isArray(start) && item.proposal_id === start[0]);
  return { proposal_votes: votedProposal ? [{ id: 1, voter: STUB_ACCOUNT, proposal: votedProposal }] : [] };
};

const listProposals: JsonRpcResults[string] = (params) => {
  const statuses = STATUSES_BY_FILTER[stringParam(params, 'status', 'all')] ?? [];
  const order = stringParam(params, 'order', 'by_total_votes');
  const direction = stringParam(params, 'order_direction', 'descending') === 'ascending' ? 1 : -1;
  const sortKey = (item: (typeof PROPOSALS)[number]) =>
    order === 'by_creator' ? item.creator : item.total_votes.padStart(20, '0');
  const proposals = PROPOSALS.filter((item) => statuses.includes(item.status)).sort(
    (a, b) => direction * sortKey(a).localeCompare(sortKey(b))
  );
  return { proposals };
};

export const PROPOSALS_PAGE_RESULTS: JsonRpcResults = {
  'database_api.list_proposals': listProposals,
  'database_api.find_accounts': ({ accounts = [] }) => ({
    accounts: accounts.map((name) =>
      fullAccount(name === 'hive.fund' ? { name, hbd_balance: hbd(DHF_STUB_HBD) } : { name })
    )
  }),
  'database_api.list_proposal_votes': listProposalVotes
};

/** HBD satoshis paid so far to the proposals that have been paid; every other id has had nothing. */
export const STUB_PROPOSALS_PAID: Record<number, string> = {
  [STUB_PROPOSALS.funded]: '30200000',
  [STUB_PROPOSALS.expired]: '1510000'
};

/** balance-api's proposal payments, one entry per distinct requested id in ascending order, as the node answers. */
const proposalsPayments: RestResults[string] = (query) =>
  [...new Set((query.get('proposal-ids') ?? '').split(',').filter(Boolean).map(Number))]
    .sort((a, b) => a - b)
    .map((id) => {
      const paid = STUB_PROPOSALS_PAID[id];
      const receiver = PROPOSALS.find((item) => item.proposal_id === id)?.receiver;
      return {
        proposal_id: id,
        receiver: paid ? receiver : null,
        total_paid: hbd(paid ?? '0'),
        payment_count: paid ? 151 : 0,
        first_payment_block: paid ? 90_000_000 : null,
        first_payment_time: paid ? '2026-01-01T00:00:00' : null,
        last_payment_block: paid ? 95_000_000 : null,
        last_payment_time: paid ? '2026-06-01T00:00:00' : null
      };
    });

export const PROPOSALS_PAYMENTS_PATH = '/balance-api/proposals/payments';

/** The proposals page's REST reads, for `startWalletApiStub`'s `rest`. */
export const PROPOSALS_PAGE_REST_RESULTS: RestResults = {
  [PROPOSALS_PAYMENTS_PATH]: proposalsPayments
};

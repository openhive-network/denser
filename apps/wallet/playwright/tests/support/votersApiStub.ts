import type { JsonRpcResults, RestResults } from './apiStub';
import { PROPOSALS_PAGE_RESULTS, STUB_PROPOSALS } from './proposalsApiStub';
import { STUB_ACCOUNT, fullAccount } from './walletApiStub';
import { STUB_WITNESSES } from './witnessApiStub';

/**
 * Voters for the voters dialog's specs, more than one page (100) of them: a witness whose voters
 * hafbe-api lists by weight, a witness hafbe-api does not serve (database_api.list_witness_votes
 * lists its voters by name), and a proposal whose voters database_api lists by name.
 */

/** How many voters each stub witness and the proposal have. */
export const VOTER_COUNT = 250;

/** The witness hafbe-api serves the voters of, and its largest voter, with own and proxied VESTS. */
export const HAFBE_WITNESS = STUB_WITNESSES[0].owner;
export const HAFBE_WHALE = 'stub-whale';
/** The witness hafbe-api does not serve (it answers 404), listed by name only. */
export const NAMES_ONLY_WITNESS = STUB_WITNESSES[1].owner;
/** The proposal the dialog lists the voters of, and its largest voter. */
export const VOTED_PROPOSAL = STUB_PROPOSALS.funded;
export const PROPOSAL_WHALE = 'stub-proposal-whale';

const pad = (index: number) => String(index).padStart(3, '0');
export const witnessVoterName = (index: number) => `stub-voter-${pad(index)}`;
export const proposalVoterName = (index: number) => `stub-pvoter-${pad(index)}`;
/** The proposal's smallest voter, who set PROPOSAL_WHALE as their proxy, so the chain counts no vote of theirs. */
export const PROPOSAL_VIA_PROXY_VOTER = proposalVoterName(VOTER_COUNT - 3);

const param = (params: object, name: string): unknown => Object.entries(params).find(([key]) => key === name)?.[1];

/** The `[owner, from]` start and the limit of a listing call. */
const listing = (params: object): { owner: unknown; from: string; limit: number } => {
  const start = param(params, 'start');
  const limit = param(params, 'limit');
  return {
    owner: Array.isArray(start) ? start[0] : undefined,
    from: Array.isArray(start) && typeof start[1] === 'string' ? start[1] : '',
    limit: typeof limit === 'number' ? limit : 1000
  };
};

/** Of `names`, in name order, those from `from` on, at most `limit`. */
const fromName = (names: readonly string[], from: string, limit: number) =>
  [...names].sort().filter((name) => name >= from).slice(0, limit);

// The whale holds 40 % of the witness's 300,000,000,000 VESTS; voter k (1-249) 250 - k shares of the rest.
const HAFBE_VOTERS = [
  { voter_name: HAFBE_WHALE, account_vests: 60_000_000_000_000_000n, proxied_vests: 60_000_000_000_000_000n },
  ...Array.from({ length: VOTER_COUNT - 1 }, (_, index) => ({
    voter_name: witnessVoterName(index + 1),
    account_vests: BigInt(VOTER_COUNT - 1 - index) * 2_880_000_000_000n,
    proxied_vests: 0n
  }))
].map((voter) => ({
  voter_name: voter.voter_name,
  vests: String(voter.account_vests + voter.proxied_vests),
  account_vests: String(voter.account_vests),
  proxied_vests: String(voter.proxied_vests),
  timestamp: '2020-01-01T00:00:00'
}));

/** hafbe-api's voters of HAFBE_WITNESS, paged and found by exact name like the real endpoint. */
export const VOTERS_REST_RESULTS: RestResults = {
  [`/hafbe-api/witnesses/${HAFBE_WITNESS}/voters`]: (query) => {
    const voterName = query.get('voter-name');
    const voters = voterName ? HAFBE_VOTERS.filter((voter) => voter.voter_name === voterName) : HAFBE_VOTERS;
    const pageSize = Number(query.get('page-size') ?? 100);
    const page = Number(query.get('page') ?? 1);
    return {
      total_votes: voters.length,
      total_pages: Math.ceil(voters.length / pageSize),
      voters: voters.slice((page - 1) * pageSize, page * pageSize)
    };
  }
};

const NAMES_ONLY_VOTERS = Array.from({ length: VOTER_COUNT }, (_, index) => `stub-name-${pad(index)}`);

/**
 * The proposal's voters: the whale (own and proxied VESTS), STUB_ACCOUNT (fullAccount's VESTS, the
 * second largest) and the rest, smaller by number; PROPOSAL_VIA_PROXY_VOTER votes through a proxy.
 */
const PROPOSAL_VOTERS = [
  PROPOSAL_WHALE,
  STUB_ACCOUNT,
  ...Array.from({ length: VOTER_COUNT - 2 }, (_, index) => proposalVoterName(index))
];

const proposalVoterWeight = (name: string) => {
  if (name === PROPOSAL_WHALE) return { vesting_shares: '60000000000000', proxied: '40000000000000' };
  if (!name.startsWith('stub-pvoter-')) return undefined;
  return { vesting_shares: String((VOTER_COUNT - Number(name.slice(-3))) * 1_000_000_000), proxied: '0' };
};

const vests = (amount: string) => ({ amount, precision: 6, nai: '@@000000037' });

const proposalPageFindAccounts = PROPOSALS_PAGE_RESULTS['database_api.find_accounts'];

/** The JSON-RPC reads of both dialogs, on top of the proposals page's and the witness page's. */
export const VOTERS_JSON_RPC_RESULTS: JsonRpcResults = {
  'database_api.list_witness_votes': (params) => {
    const { owner, from, limit } = listing(params);
    const names = owner === NAMES_ONLY_WITNESS ? fromName(NAMES_ONLY_VOTERS, from, limit) : [];
    return { votes: names.map((account, id) => ({ id, witness: owner, account })) };
  },
  'database_api.list_proposal_votes': (params) => {
    const { owner, from, limit } = listing(params);
    const proposal = { id: VOTED_PROPOSAL, proposal_id: VOTED_PROPOSAL };
    const names = owner === VOTED_PROPOSAL ? fromName(PROPOSAL_VOTERS, from, limit) : [];
    return { proposal_votes: names.map((voter, id) => ({ id, voter, proposal })) };
  },
  'database_api.find_accounts': (params) => {
    const { accounts } = proposalPageFindAccounts(params) as { accounts: { name: string }[] };
    return {
      accounts: accounts.map((account) => {
        const weight = proposalVoterWeight(account.name);
        if (!weight) return account;
        return fullAccount({
          name: account.name,
          vesting_shares: vests(weight.vesting_shares),
          proxied_vsf_votes: [weight.proxied, 0, 0, 0],
          proxy: account.name === PROPOSAL_VIA_PROXY_VOTER ? PROPOSAL_WHALE : ''
        });
      })
    };
  }
};

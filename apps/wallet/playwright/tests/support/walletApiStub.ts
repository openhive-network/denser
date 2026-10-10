import type { Server } from 'node:http';
import type { Page } from '@playwright/test';
import { FIXTURE_API_PORT, startApiStub, type JsonRpcResults, type RestResults } from './apiStub';
import { WITNESS_RESULTS } from './witnessApiStub';

/**
 * The reads of the wallet's market, proposals, witnesses, delegations and transfers pages,
 * answered with fixed, hand-written data (served by apiStub.ts), so the offline specs can load
 * those pages with their content.
 */

export const STUB_ACCOUNT = 'gtg';
export const STUB_PROPOSAL_SUBJECT = 'Stub proposal for the offline specs';
export const STUB_DELEGATEE = 'stub-delegatee';
export const STUB_TRANSFER_SENDER = 'stub-sender';
/** The one account STUB_ACCOUNT follows: the transfer dialog suggests it as a recipient. */
export const STUB_FOLLOWED = 'stub-followed';

const hive = (amount: string) => ({ amount, precision: 3, nai: '@@000000021' });
const hbd = (amount: string) => ({ amount, precision: 3, nai: '@@000000013' });
const vests = (amount: string) => ({ amount, precision: 6, nai: '@@000000037' });

const authority = { weight_threshold: 1, account_auths: [], key_auths: [] };
const manabar = { current_mana: '0', last_update_time: 1_759_000_000 };

/** A database_api account with every field the wallet's account mapping reads. */
export const fullAccount = (account: { name: string; [field: string]: unknown }) => ({
  owner: authority,
  active: authority,
  posting: authority,
  memo_key: 'STM6vJmrwaX5TjgTS9dPH8KsArso5m91fVodJvv91j7G765wqcNM9',
  post_count: 0,
  created: '2016-06-30T17:22:18',
  last_vote_time: '2026-10-01T12:00:00',
  last_post: '2026-10-01T12:00:00',
  reward_hive_balance: hive('0'),
  reward_hbd_balance: hbd('0'),
  reward_vesting_hive: hive('0'),
  reward_vesting_balance: vests('0'),
  governance_vote_expiration_ts: '2027-10-01T12:00:00',
  balance: hive('1234567'),
  hbd_balance: hbd('2500'),
  savings_balance: hive('0'),
  savings_hbd_balance: hbd('0'),
  hbd_last_interest_payment: '1970-01-01T00:00:00',
  savings_hbd_seconds_last_update: '1970-01-01T00:00:00',
  savings_hbd_seconds: '0',
  next_vesting_withdrawal: '1969-12-31T23:59:59',
  vesting_shares: vests('1650000000000'),
  post_voting_power: vests('1650000000000'),
  delegated_vesting_shares: vests('0'),
  received_vesting_shares: vests('0'),
  vesting_withdraw_rate: vests('0'),
  to_withdraw: 0,
  withdrawn: 0,
  proxy: '',
  proxied_vsf_votes: [0, 0, 0, 0],
  voting_manabar: manabar,
  downvote_manabar: manabar,
  ...account
});

const findAccounts: JsonRpcResults[string] = (params) => {
  const { accounts } = WITNESS_RESULTS['database_api.find_accounts'](params) as {
    accounts: { name: string }[];
  };
  return { accounts: accounts.map(fullAccount) };
};

/**
 * A `database_api.find_accounts` replacement, for `startWalletApiStub`'s `jsonRpc`, that gives
 * STUB_ACCOUNT `fields` over its stub data.
 */
export const stubAccountWith = (fields: Record<string, unknown>): JsonRpcResults => ({
  'database_api.find_accounts': (params) => {
    const { accounts } = findAccounts(params) as { accounts: { name: string }[] };
    return { accounts: accounts.map((account) => (account.name === STUB_ACCOUNT ? { ...account, ...fields } : account)) };
  }
});

/** STUB_ACCOUNT's fields while it powers down 330,000 VESTS (180 HP) over 13 weeks, none withdrawn yet. */
export const STUB_POWER_DOWN_FIELDS = {
  to_withdraw: 330_000_000_000,
  withdrawn: 0,
  vesting_withdraw_rate: vests('25384615384'),
  next_vesting_withdrawal: '2026-10-08T12:00:00'
};

const proposal = {
  id: 7,
  proposal_id: 7,
  creator: STUB_ACCOUNT,
  receiver: STUB_ACCOUNT,
  start_date: '2026-01-01T00:00:00',
  end_date: '2027-01-01T00:00:00',
  daily_pay: hbd('100000'),
  subject: STUB_PROPOSAL_SUBJECT,
  permlink: 'stub-proposal',
  total_votes: '50000000000000000',
  status: 'active'
};

/** STUB_ACCOUNT's witness votes, as `database_api.list_witness_votes` returns them. */
export const stubWitnessVotes = (witnesses: string[]): JsonRpcResults => ({
  'database_api.list_witness_votes': () => ({
    votes: witnesses.map((witness, id) => ({ id, witness, account: STUB_ACCOUNT }))
  })
});

/** STUB_ACCOUNT's votes on the stub proposal, as `database_api.list_proposal_votes` returns them. */
export const stubProposalVotes = (voted: boolean): JsonRpcResults => ({
  'database_api.list_proposal_votes': () => ({
    proposal_votes: voted ? [{ id: 1, voter: STUB_ACCOUNT, proposal }] : []
  })
});

/** STUB_ACCOUNT with `proxy` as its witness proxy. */
export const stubAccountProxy = (proxy: string): JsonRpcResults => ({
  'database_api.find_accounts': (params) => {
    const { accounts } = findAccounts(params) as { accounts: { name: string }[] };
    return {
      accounts: accounts.map((account) => (account.name === STUB_ACCOUNT ? { ...account, proxy } : account))
    };
  }
});

/** A `transfer_operation` of the account history, as the hivemind operations API returns it. */
export const stubTransfer = ({
  from,
  operationId,
  memo = ''
}: {
  from: string;
  operationId: string;
  memo?: string;
}) => ({
  op: {
    type: 'transfer_operation',
    value: { from, to: STUB_ACCOUNT, amount: hive('1000'), memo }
  },
  block: 99_999_000,
  trx_id: '0000000000000000000000000000000000000001',
  op_pos: 0,
  op_type_id: 2,
  timestamp: '2026-10-01T12:00:00',
  virtual_op: false,
  operation_id: operationId,
  trx_in_block: 0
});

const JSON_RPC_RESULTS: JsonRpcResults = {
  ...WITNESS_RESULTS,
  'database_api.find_accounts': findAccounts,
  'database_api.get_dynamic_global_properties': () => ({
    ...(WITNESS_RESULTS['database_api.get_dynamic_global_properties']({}) as object),
    time: '2026-10-01T12:00:00',
    // The reference block of the transactions the wallet builds (the sign-in challenge's).
    head_block_id: '05f5e0ff00000000000000000000000000000000',
    downvote_pool_percent: 2500,
    virtual_supply: hive('450000000000'),
    vesting_reward_percent: 1500,
    hbd_interest_rate: 1500
  }),
  'database_api.get_feed_history': () => ({
    current_median_history: { base: hbd('250'), quote: hive('1000') },
    price_history: []
  }),
  'database_api.find_savings_withdrawals': () => ({ withdrawals: [] }),
  'database_api.list_limit_orders': () => ({ orders: [] }),
  'database_api.list_proposals': () => ({ proposals: [proposal] }),
  ...stubProposalVotes(false),
  ...stubWitnessVotes([]),
  'database_api.list_vesting_delegations': () => ({
    delegations: [
      {
        id: 1,
        delegator: STUB_ACCOUNT,
        delegatee: STUB_DELEGATEE,
        vesting_shares: vests('1650000000'),
        min_delegation_time: '2026-09-01T12:00:00'
      }
    ]
  }),
  'database_api.find_vesting_delegation_expirations': () => ({ delegations: [] }),
  'rc_api.list_rc_direct_delegations': () => ({ rc_direct_delegations: [] }),
  'rc_api.find_rc_accounts': ({ accounts = [] }) => ({
    rc_accounts: accounts.map((account) => ({
      account,
      rc_manabar: manabar,
      max_rc_creation_adjustment: vests('0'),
      max_rc: '1000000000000',
      delegated_rc: 0,
      received_delegated_rc: 0
    }))
  }),
  'condenser_api.get_following': () => [{ follower: STUB_ACCOUNT, following: STUB_FOLLOWED, what: ['blog'] }],
  'market_history_api.get_ticker': () => ({
    latest: '0.250000',
    lowest_ask: '0.251000',
    highest_bid: '0.249000',
    percent_change: '1.50',
    hive_volume: hive('100000000'),
    hbd_volume: hbd('25000000')
  }),
  'market_history_api.get_order_book': () => ({ bids: [], asks: [] }),
  'market_history_api.get_recent_trades': () => ({ trades: [] }),
  'market_history_api.get_trade_history': () => ({ trades: [] })
};

const REST_RESULTS: RestResults = {
  '/hafah-api/operation-types': () => [
    { op_type_id: 2, operation_name: 'transfer_operation', is_virtual: false }
  ],
  [`/hivemind-api/accounts/${STUB_ACCOUNT}/operations`]: () => ({
    total_operations: 1,
    total_pages: 1,
    block_range: { from: 1, to: 100_000_000 },
    operations_result: [stubTransfer({ from: STUB_TRANSFER_SENDER, operationId: '429492434051907584' })]
  }),
  [`/balance-api/accounts/${STUB_ACCOUNT}/delegations`]: () => ({ outgoing_delegations: [], incoming_delegations: [] })
};

/**
 * Starts the stub node with the wallet pages' reads, `jsonRpc` replacing some of them; resolves
 * with the server to close after the spec.
 */
export const startWalletApiStub = (port = FIXTURE_API_PORT, jsonRpc: JsonRpcResults = {}): Promise<Server> =>
  startApiStub({ jsonRpc: { ...JSON_RPC_RESULTS, ...jsonRpc }, rest: REST_RESULTS }, port);

/**
 * Logs a stub account in on the client, as the blog's fixture seeder does: the stored user is what
 * `useUser` starts from. Pass a key type (`'posting'`/`'active'`) or options
 * (`username`, `loginType`, `keyType`); defaults: STUB_ACCOUNT, `wif`, `posting`.
 */
export const logInAsStubAccount = (
  page: Page,
  options:
    | 'posting'
    | 'active'
    | { username?: string; loginType?: 'wif' | 'keychain'; keyType?: 'posting' | 'active' } = {}
) => {
  const { username = STUB_ACCOUNT, loginType = 'wif', keyType = 'posting' } =
    typeof options === 'string' ? { keyType: options } : options;
  return page.context().addInitScript(
    ({ username, loginType, keyType }) => {
      window.localStorage.setItem(
        'user',
        JSON.stringify({
          isLoggedIn: true,
          username,
          avatarUrl: '',
          loginType,
          keyType,
          authenticateOnBackend: false,
          chatAuthToken: '',
          oauthConsent: {},
          strict: false
        })
      );
    },
    { username, loginType, keyType }
  );
};

/**
 * Stores `wif` as STUB_ACCOUNT's `keyType` key where the WIF signer reads it
 * (`wif.{username}@{keyType}`, smart-signer's signer-wif.ts), so signing asks for no key.
 */
export const storeStubAccountKey = (page: Page, keyType: 'posting' | 'active', wif: string) =>
  page.context().addInitScript(
    ({ storageKey, value }) => window.localStorage.setItem(storageKey, value),
    { storageKey: `wif.${STUB_ACCOUNT}@${keyType}`, value: JSON.stringify(wif) }
  );

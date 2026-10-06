import type { Server } from 'node:http';
import { FIXTURE_API_PORT, startApiStub, type JsonRpcResults } from './apiStub';

/**
 * The reads of the witness page, answered with a fixed, hand-written witness list, so the offline
 * wallet specs can check what the server renders from it (served by apiStub.ts).
 */

const HEAD_BLOCK = 100_000_000;

export const STUB_WITNESSES = [
  { owner: 'stub-alpha', votes: '300000000000000000', description: 'Alpha runs a stub witness node' },
  { owner: 'stub-beta', votes: '200000000000000000', description: 'Beta runs another one' },
  { owner: 'stub-gamma', votes: '100000000000000000', description: 'Gamma completes the list' }
] as const;

const witness = ({ owner, votes }: (typeof STUB_WITNESSES)[number], id: number) => ({
  id,
  owner,
  created: '2020-03-20T14:00:00',
  url: `https://hive.blog/@${owner}/witness-post`,
  votes,
  total_missed: 0,
  last_confirmed_block_num: HEAD_BLOCK - 10,
  signing_key: 'STM6vJmrwaX5TjgTS9dPH8KsArso5m91fVodJvv91j7G765wqcNM9',
  props: {
    account_creation_fee: { amount: '3000', precision: 3, nai: '@@000000021' },
    maximum_block_size: 65536,
    account_subsidy_budget: 797
  },
  hbd_exchange_rate: {
    base: { amount: '250', precision: 3, nai: '@@000000013' },
    quote: { amount: '1000', precision: 3, nai: '@@000000021' }
  },
  last_hbd_exchange_update: '2026-10-01T12:00:00',
  running_version: '1.27.11',
  available_witness_account_subsidies: 0
});

const account = (name: string) => {
  const description = STUB_WITNESSES.find((stubWitness) => stubWitness.owner === name)?.description;
  return {
    name,
    posting_json_metadata: JSON.stringify({ profile: { witness_description: description } }),
    json_metadata: ''
  };
};

export const WITNESS_RESULTS: JsonRpcResults = {
  'database_api.get_dynamic_global_properties': () => ({
    head_block_number: HEAD_BLOCK,
    total_vesting_fund_hive: { amount: '180000000000', precision: 3, nai: '@@000000021' },
    total_vesting_shares: { amount: '330000000000000000', precision: 6, nai: '@@000000037' }
  }),
  'database_api.list_witnesses': () => ({ witnesses: STUB_WITNESSES.map(witness) }),
  'database_api.find_accounts': (params) => ({ accounts: (params.accounts ?? []).map(account) })
};

/** Starts the stub node with the witness page's reads; resolves with the server to close after the spec. */
export const startWitnessApiStub = (port = FIXTURE_API_PORT): Promise<Server> =>
  startApiStub({ jsonRpc: WITNESS_RESULTS }, port);

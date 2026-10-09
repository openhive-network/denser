import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'chai';
import { EXTENDED_REST_API_DEFINITION } from '@hive/common-hiveio-packages/wax';
import { createReadClient, JsonRpcApiError } from './read-client';
import { fetchReadTransport, ReadTransportError } from './read-transport';
import { calculateCurrentManabarValue, calculateManabarFullRegenerationTime } from './manabar-math';
import { isTransportError } from './wax-errors';
import { hiveToHbdSatoshis, vestsToHiveSatoshis } from '../../ui/lib/asset-math';
import { formatAsset, formatOptionalAsset } from '../../ui/lib/asset-format';
import { createNaiAsset } from '../../ui/lib/asset-constants';

/**
 * The wasm-free read client and the asset and manabar math that replaced wax calls must give the same results
 * as wax itself. Both clients run against the same recorded fake `fetch`, so every sample checks
 * the HTTP request each one sends as well as the value it resolves to.
 *
 * `@hiveio/wax` is ESM-only; the mocha runner is CommonJS, which would turn `import()` into
 * `require()`, so the real package is loaded through a native dynamic import.
 */

type ApiFn = (params?: unknown) => Promise<unknown>;
interface IApiTree {
  [key: string]: IApiTree & ApiFn;
}
interface INaiAsset {
  amount: string;
  precision: number;
  nai: string;
}
interface IWaxChain {
  api: IApiTree;
  restApi: IApiTree;
  extend(): IWaxChain;
  extendRest(definition: object): IWaxChain;
  vestsSatoshis(amount: string): INaiAsset;
  hiveSatoshis(amount: string): INaiAsset;
  hbdSatoshis(amount: string): INaiAsset;
  formatter: IWaxFormatter;
  vestsToHp(vests: INaiAsset, totalVestingFundHive: INaiAsset, totalVestingShares: INaiAsset): INaiAsset;
  hiveToHbd(amount: INaiAsset, base: INaiAsset, quote: INaiAsset): INaiAsset;
  calculateCurrentManabarValue(now: number, maxMana: string, currentMana: string, lastUpdateTime: number): IManabarValue;
  calculateManabarFullRegenerationTime(now: number, maxMana: string, currentMana: string, lastUpdateTime: number): number;
}
interface IManabarValue {
  max: bigint;
  current: bigint;
  percent: number;
}
interface IWaxFormatter {
  format(value: unknown): string;
  extend(options: object): IWaxFormatter;
}
interface IWaxModule {
  createHiveChain(options: object): Promise<IWaxChain>;
  WaxRequestError: new (...args: never[]) => Error;
}

const importEsm = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;

const CHAIN_ID = 'beeab0de00000000000000000000000000000000000000000000000000000000';
const API = 'https://api.example';
const REST = 'https://rest.example';
const AI = 'https://ai.example';
const SEARCH = 'https://search.example';
const TIMEOUT_MS = 2_000;

interface IRecordedRequest {
  url: string;
  method: string;
  contentType: string | null;
  body: string | null;
}

type Responder = (request: IRecordedRequest) => { status: number; body: unknown };

const createFakeFetch = (responder: Responder) => {
  const requests: IRecordedRequest[] = [];
  const fakeFetch = async (input: string | URL, init: RequestInit = {}): Promise<Response> => {
    const request: IRecordedRequest = {
      url: String(input),
      method: init.method ?? 'GET',
      contentType: new Headers(init.headers).get('content-type'),
      body: typeof init.body === 'string' ? init.body : null
    };
    requests.push(request);
    const { status, body } = responder(request);
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  };
  return { requests, fakeFetch };
};

const jsonRpcResult = (request: IRecordedRequest) => {
  const { method, params } = JSON.parse(request.body ?? '{}');
  return { status: 200, body: { jsonrpc: '2.0', id: 1, result: { echoedMethod: method, echoedParams: params ?? null } } };
};

const restResult = (request: IRecordedRequest) => ({
  status: 200,
  body: [{ author: 'alice', permlink: 'p', echoedUrl: request.url, echoedBody: request.body }]
});

const answerAll: Responder = (request) => (request.method === 'POST' && request.body?.includes('"jsonrpc"') ? jsonRpcResult(request) : restResult(request));

describe('wasm-free reads, asset and manabar math are equivalent to wax', function () {
  let wax: IWaxModule;
  let waxChain: IWaxChain;
  let readClient: { api: IApiTree; restApi: IApiTree };
  const realFetch = globalThis.fetch;

  before(async function () {
    this.timeout(30_000);
    wax = (await importEsm('@hiveio/wax')) as IWaxModule;
    const baseChain = await wax.createHiveChain({
      chainId: CHAIN_ID,
      apiEndpoint: API,
      restApiEndpoint: REST,
      apiTimeout: TIMEOUT_MS
    });
    waxChain = baseChain.extend().extendRest(EXTENDED_REST_API_DEFINITION);
    waxChain.restApi['hivesense-api'].endpointUrl = AI as never;
    waxChain.api['search-api'].find_text.endpointUrl = SEARCH as never;

    readClient = createReadClient<IApiTree, IApiTree>({
      getConfig: () => ({
        chainId: CHAIN_ID,
        apiEndpoint: API,
        restApiEndpoint: REST,
        timeoutMs: TIMEOUT_MS,
        jsonRpcEndpoints: { 'search-api.find_text': SEARCH },
        restEndpoints: { 'hivesense-api': AI }
      }),
      transport: fetchReadTransport,
      restApiDefinition: EXTENDED_REST_API_DEFINITION
    });
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  /** Runs `call` through wax and then the read client; returns what each sent and resolved to. */
  const callBoth = async (call: (client: { api: IApiTree; restApi: IApiTree }) => Promise<unknown>, responder = answerAll) => {
    const viaWax = createFakeFetch(responder);
    globalThis.fetch = viaWax.fakeFetch as typeof fetch;
    const waxResult = await call(waxChain);

    const viaReadClient = createFakeFetch(responder);
    globalThis.fetch = viaReadClient.fakeFetch as typeof fetch;
    const readResult = await call(readClient);

    return { waxRequests: viaWax.requests, readRequests: viaReadClient.requests, waxResult, readResult };
  };

  const samples: Array<[string, (client: { api: IApiTree; restApi: IApiTree }) => Promise<unknown>, string]> = [
    [
      'bridge.get_ranked_posts',
      (c) =>
        c.api.bridge.get_ranked_posts({
          sort: 'trending',
          tag: '',
          start_author: '',
          start_permlink: '',
          limit: 20,
          observer: 'hive.blog'
        }),
      API
    ],
    ['bridge.get_post', (c) => c.api.bridge.get_post({ author: 'alice', permlink: 'p', observer: '' }), API],
    [
      'bridge.list_communities with an undefined param',
      (c) => c.api.bridge.list_communities({ sort: 'rank', query: undefined, observer: 'hive.blog' }),
      API
    ],
    ['condenser_api.get_following (positional params)', (c) => c.api.condenser_api.get_following(['alice', '', 'blog', 50]), API],
    [
      'database_api.find_accounts',
      (c) => c.api.database_api.find_accounts({ accounts: ['alice'], delayed_votes_active: false }),
      API
    ],
    [
      'database_api.list_witnesses (int64 start as a string)',
      (c) =>
        c.api.database_api.list_witnesses({ start: ['9223372036854775807', ''], limit: 250, order: 'by_vote_name' }),
      API
    ],
    ['database_api.get_feed_history (no params)', (c) => c.api.database_api.get_feed_history(), API],
    ['search-api.find_text (own endpoint)', (c) => c.api['search-api'].find_text({ pattern: 'hive', sort: 'relevance' }), SEARCH],
    [
      'hivesense posts.search (GET query)',
      (c) => c.restApi['hivesense-api'].posts.search({ q: 'vector databases & hive', truncate: 100, result_limit: 100, full_posts: 10, observer: '' }),
      AI
    ],
    [
      'hivesense posts.author.permlink.similar (path params)',
      (c) =>
        c.restApi['hivesense-api'].posts.author.permlink.similar({
          author: 'alice',
          permlink: 'my-post',
          truncate: 100,
          result_limit: 5,
          full_posts: 2,
          observer: 'bob'
        }),
      AI
    ],
    [
      'hivesense posts.byIds (POST body)',
      (c) => c.restApi['hivesense-api'].posts.byIds({ posts: [{ author: 'alice', permlink: 'p' }], truncate: 0, observer: '' }),
      AI
    ],
    [
      'hivemind accountsOperations (placeholder in a multi-segment urlPath)',
      (c) => c.restApi['hivemind-api'].accountsOperations({ 'account-name': 'alice', page: 2, 'operation-types': [1, 2] }),
      REST
    ],
    [
      'hivemind accountsOperations (wallet history: comma-joined operation types, observer)',
      (c) =>
        c.restApi['hivemind-api'].accountsOperations({
          'account-name': 'alice',
          page: undefined,
          'page-size': 500,
          'operation-types': '2,3,49',
          'observer-name': 'hive.blog'
        }),
      REST
    ],
    ['hafah operation-types (no params)', (c) => c.restApi['hafah-api']['operation-types'](), REST],
    ['rc_api.find_rc_accounts', (c) => c.api.rc_api.find_rc_accounts({ accounts: ['alice'] }), API],
    ['rc_api.list_rc_direct_delegations', (c) => c.api.rc_api.list_rc_direct_delegations({ limit: 1000, start: ['alice', ''] }), API],
    [
      'database_api.list_proposals',
      (c) =>
        c.api.database_api.list_proposals({
          start: [],
          limit: 30,
          order: 'by_total_votes',
          order_direction: 'descending',
          status: 'votable'
        }),
      API
    ],
    [
      'database_api.list_proposal_votes',
      (c) =>
        c.api.database_api.list_proposal_votes({
          start: [42, ''],
          limit: 1000,
          order: 'by_proposal_voter',
          order_direction: 'ascending',
          status: 'all'
        }),
      API
    ],
    [
      'database_api.list_vesting_delegations',
      (c) => c.api.database_api.list_vesting_delegations({ start: ['alice', ''], limit: 1000, order: 'by_delegation' }),
      API
    ],
    [
      'database_api.list_limit_orders',
      (c) => c.api.database_api.list_limit_orders({ start: ['alice', 0], limit: 1000, order: 'by_account' }),
      API
    ],
    ['database_api.find_savings_withdrawals', (c) => c.api.database_api.find_savings_withdrawals({ account: 'alice' }), API],
    ['database_api.find_owner_histories', (c) => c.api.database_api.find_owner_histories({ owner: 'alice' }), API],
    ['market_history_api.get_ticker (empty params)', (c) => c.api.market_history_api.get_ticker({}), API],
    ['market_history_api.get_order_book', (c) => c.api.market_history_api.get_order_book({ limit: 500 }), API],
    [
      'market_history_api.get_trade_history',
      (c) => c.api.market_history_api.get_trade_history({ start: '2026-10-01T00:00:00', end: '2026-10-01T10:00:00', limit: 1000 }),
      API
    ],
    ['market_history_api.get_recent_trades', (c) => c.api.market_history_api.get_recent_trades({ limit: 1000 }), API]
  ];

  for (const [name, call, endpoint] of samples) {
    it(`${name}: same request and same result`, async () => {
      const { waxRequests, readRequests, waxResult, readResult } = await callBoth(call);

      expect(waxRequests).to.have.length(1);
      expect(readRequests).to.deep.equal(waxRequests);
      expect(readRequests[0].url.startsWith(endpoint)).to.equal(true, readRequests[0].url);
      expect(readResult).to.deep.equal(waxResult);
    });
  }

  const transportFailures: Array<[string, Responder]> = [
    ['an HTTP 5xx', () => ({ status: 503, body: { message: 'unavailable' } })],
    ['an HTTP 429', () => ({ status: 429, body: { message: 'too many requests' } })]
  ];

  for (const [name, responder] of transportFailures) {
    it(`${name} rejects both with a transport error`, async () => {
      globalThis.fetch = createFakeFetch(responder).fakeFetch as typeof fetch;
      const waxError = await waxChain.api.bridge.get_post({ author: 'a', permlink: 'p', observer: '' }).catch((error: unknown) => error);
      const readError = await readClient.api.bridge.get_post({ author: 'a', permlink: 'p', observer: '' }).catch((error: unknown) => error);

      expect(waxError).to.be.instanceOf(wax.WaxRequestError);
      expect(readError).to.be.instanceOf(ReadTransportError);
      expect(isTransportError(readError)).to.equal(true);
    });
  }

  it('a network failure rejects the read client with a transport error carrying the cause', async () => {
    const networkError = new TypeError('fetch failed');
    globalThis.fetch = (async () => {
      throw networkError;
    }) as typeof fetch;
    const readError = await readClient.api.bridge.get_post({ author: 'a', permlink: 'p', observer: '' }).catch((error: unknown) => error);

    expect(readError).to.be.instanceOf(ReadTransportError);
    expect((readError as Error).cause).to.equal(networkError);
    expect(isTransportError(readError)).to.equal(true);
  });

  it('a malformed JSON body rejects the read client with a transport error', async () => {
    globalThis.fetch = (async () => new Response('<html>bad gateway</html>', { status: 200 })) as typeof fetch;
    const readError = await readClient.api.bridge.get_post({ author: 'a', permlink: 'p', observer: '' }).catch((error: unknown) => error);

    expect(readError).to.be.instanceOf(ReadTransportError);
    expect((readError as Error).message).to.contain('malformed JSON');
  });

  it('a request slower than the timeout rejects the read client with a transport error', async () => {
    globalThis.fetch = ((_input: string | URL, init: RequestInit = {}) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      })) as typeof fetch;
    const shortTimeoutClient = createReadClient<IApiTree, IApiTree>({
      getConfig: () => ({ chainId: CHAIN_ID, apiEndpoint: API, restApiEndpoint: REST, timeoutMs: 10 }),
      transport: fetchReadTransport,
      restApiDefinition: EXTENDED_REST_API_DEFINITION
    });
    const readError = await shortTimeoutClient.api.bridge.get_post({ author: 'a', permlink: 'p', observer: '' }).catch((error: unknown) => error);

    expect(readError).to.be.instanceOf(ReadTransportError);
    expect((readError as Error).message).to.match(/^Request timed out/);
  });

  it('a JSON-RPC error answer rejects both, and neither as a transport error', async () => {
    const notFound: Responder = () => ({
      status: 200,
      body: { jsonrpc: '2.0', id: 1, error: { code: -32602, message: 'Invalid parameters', data: 'Post alice/missing does not exist' } }
    });

    globalThis.fetch = createFakeFetch(notFound).fakeFetch as typeof fetch;
    const waxError = await waxChain.api.bridge.get_post({ author: 'alice', permlink: 'missing', observer: '' }).catch((error: unknown) => error);
    const readError = await readClient.api.bridge.get_post({ author: 'alice', permlink: 'missing', observer: '' }).catch((error: unknown) => error);

    expect(waxError).to.be.instanceOf(Error).and.not.instanceOf(wax.WaxRequestError);
    expect(readError).to.be.instanceOf(JsonRpcApiError).and.not.instanceOf(ReadTransportError);
    expect(isTransportError(readError)).to.equal(false);
    expect((readError as Error).message).to.equal('bridge.get_post: Invalid parameters');
  });

  it('vestsToHiveSatoshis matches wax vestsToHp', () => {
    const fund = '200000000000';
    const shares = '400000000000000000';
    for (const vests of ['0', '1', '123456789012', '-123456789012', '999999999999999', '400000000000000000']) {
      const expected = waxChain.vestsToHp(waxChain.vestsSatoshis(vests), waxChain.hiveSatoshis(fund), waxChain.vestsSatoshis(shares));

      expect(vestsToHiveSatoshis(BigInt(vests), BigInt(fund), BigInt(shares)).toString()).to.equal(expected.amount, vests);
    }
  });

  it('hiveToHbdSatoshis matches wax hiveToHbd', () => {
    const prices = [
      ['250', '1000'],
      ['57', '1000'],
      ['1000', '3333'],
      ['123456', '1000']
    ];
    for (const [base, quote] of prices) {
      for (const hive of ['0', '1', '999', '123456789012', '-123456789012', '9007199254740993']) {
        const expected = waxChain.hiveToHbd(waxChain.hiveSatoshis(hive), waxChain.hbdSatoshis(base), waxChain.hiveSatoshis(quote));

        expect(hiveToHbdSatoshis(BigInt(hive), BigInt(base), BigInt(quote)).toString()).to.equal(
          expected.amount,
          `${hive} at ${base}/${quote}`
        );
      }
    }
  });

  const SATOSHI_SAMPLES = ['0', '1', '999', '1000', '1234567', '100000000', '123456789012', '9007199254740993'];

  it('createNaiAsset matches wax hiveSatoshis / hbdSatoshis / vestsSatoshis', () => {
    for (const satoshis of SATOSHI_SAMPLES) {
      expect(createNaiAsset('HIVE', satoshis)).to.deep.equal(waxChain.hiveSatoshis(satoshis), satoshis);
      expect(createNaiAsset('HBD', BigInt(satoshis))).to.deep.equal(waxChain.hbdSatoshis(satoshis), satoshis);
      expect(createNaiAsset('VESTS', satoshis)).to.deep.equal(waxChain.vestsSatoshis(satoshis), satoshis);
    }
  });

  it('formatAsset matches wax formatter.format, with and without the token name', () => {
    const noTokenName = waxChain.formatter.extend({
      asset: { displayAsNai: false, appendTokenName: false, formatAmount: true }
    });
    for (const satoshis of SATOSHI_SAMPLES) {
      for (const asset of [waxChain.hiveSatoshis(satoshis), waxChain.hbdSatoshis(satoshis), waxChain.vestsSatoshis(satoshis)]) {
        expect(formatAsset(asset)).to.equal(waxChain.formatter.format(asset), JSON.stringify(asset));
        expect(formatAsset(asset, { appendTokenName: false })).to.equal(noTokenName.format(asset), JSON.stringify(asset));
      }
    }
  });

  it('formatAsset keeps the exact value of a negative amount', () => {
    expect(formatAsset(createNaiAsset('HIVE', '-1234567'))).to.equal(`-${formatAsset(createNaiAsset('HIVE', '1234567'))}`);
    expect(formatAsset(createNaiAsset('VESTS', '-1'))).to.equal(`-${formatAsset(createNaiAsset('VESTS', '1'))}`);
  });

  it('formatAsset rejects a NAI that is not a Hive asset', () => {
    expect(() => formatAsset({ amount: '1', precision: 3, nai: '@@000000999' })).to.throw('Unknown asset NAI');
  });

  describe('account history formatting of recorded operations', () => {
    interface IRecordedOperation {
      operation_id: string;
      op: { type: string; value: Record<string, INaiAsset | unknown> };
    }
    const { dynamicGlobalProperties, operations } = JSON.parse(
      readFileSync(join(__dirname, '__fixtures__/wallet-history-operations.json'), 'utf8')
    ) as {
      dynamicGlobalProperties: { total_vesting_fund_hive: INaiAsset; total_vesting_shares: INaiAsset };
      operations: IRecordedOperation[];
    };

    /** The fields the wallet history formatter renders, per operation type: as an asset, or as Hive Power. */
    const HISTORY_FIELDS: Record<string, { assets: string[]; hivePower: string[] }> = {
      claim_reward_balance_operation: { assets: ['reward_hbd', 'reward_hive'], hivePower: ['reward_vests'] },
      transfer_from_savings_operation: { assets: ['amount'], hivePower: [] },
      transfer_operation: { assets: ['amount'], hivePower: [] },
      transfer_to_savings_operation: { assets: ['amount'], hivePower: [] },
      transfer_to_vesting_operation: { assets: ['amount'], hivePower: [] },
      interest_operation: { assets: ['interest'], hivePower: [] },
      cancel_transfer_from_savings_operation: { assets: [], hivePower: [] },
      fill_order_operation: { assets: ['current_pays', 'open_pays'], hivePower: [] },
      withdraw_vesting_operation: { assets: [], hivePower: ['vesting_shares'] },
      recurrent_transfer_operation: { assets: ['amount'], hivePower: [] },
      fill_recurrent_transfer_operation: { assets: ['amount'], hivePower: [] },
      failed_recurrent_transfer_operation: { assets: ['amount'], hivePower: [] },
      author_reward_operation: { assets: ['hbd_payout', 'hive_payout'], hivePower: ['vesting_payout'] }
    };

    const formattedOperations = operations.filter(({ op }) => op.type in HISTORY_FIELDS);
    const fieldSamples = (kind: 'assets' | 'hivePower') =>
      formattedOperations.flatMap(({ operation_id, op }) =>
        HISTORY_FIELDS[op.type][kind].map((field) => ({
          sample: `${op.type} ${operation_id} ${field}`,
          asset: op.value[field] as INaiAsset | undefined
        }))
      );

    it('the recordings hold every operation type the history formats', () => {
      const recordedTypes = new Set(formattedOperations.map(({ op }) => op.type));

      expect([...recordedTypes].sort()).to.deep.equal(Object.keys(HISTORY_FIELDS).sort());
    });

    it('every asset matches wax formatter.format', () => {
      const samples = fieldSamples('assets');

      expect(samples.length).to.be.greaterThan(0);
      for (const { sample, asset } of samples) {
        expect(asset, sample).to.not.equal(undefined);
        expect(formatOptionalAsset(asset)).to.equal(waxChain.formatter.format(asset), sample);
      }
    });

    it('an absent asset formats as an empty string, as the wax formatter path rendered it', () => {
      expect(formatOptionalAsset(undefined)).to.equal('');
    });

    it('every vesting share amount matches wax vestsToHp formatted by wax', () => {
      const { total_vesting_fund_hive: fund, total_vesting_shares: shares } = dynamicGlobalProperties;
      const samples = fieldSamples('hivePower');

      expect(samples.length).to.be.greaterThan(0);
      for (const { sample, asset } of samples) {
        const hiveSatoshis = vestsToHiveSatoshis(BigInt(asset.amount), BigInt(fund.amount), BigInt(shares.amount));

        expect(formatAsset(createNaiAsset('HIVE', hiveSatoshis))).to.equal(
          waxChain.formatter.format(waxChain.vestsToHp(asset, fund, shares)),
          sample
        );
      }
    });
  });

  const NOW = 1_700_000_000;
  /** [max mana, current mana, seconds since the last update]; a negative age is an update after `NOW`. */
  const MANABAR_SAMPLES: [string, string, number][] = [
    ['1000000', '500000', 0],
    ['1000000', '500000', 1],
    ['1000000', '500000', 1000],
    ['1000000', '0', 431_999],
    ['1000000', '0', 432_000],
    ['1000000', '1000000', 100],
    ['1000000', '2000000', 100],
    ['1000000', '500000', -500],
    ['1000000', '1000000', -500],
    ['7', '3', 10],
    ['432000', '1', 5000],
    ['5000000000', '1000', 1000],
    ['987654321098765432', '12345678901234567', 10_000],
    ['987654321098765432', '12345678901234567', 100_000_000]
  ];

  it('calculateCurrentManabarValue matches wax', () => {
    for (const [max, current, age] of MANABAR_SAMPLES) {
      const sample = `${max} ${current} ${age}`;
      expect(calculateCurrentManabarValue(NOW, max, current, NOW - age)).to.deep.equal(
        waxChain.calculateCurrentManabarValue(NOW, max, current, NOW - age),
        sample
      );
    }
  });

  it('calculateManabarFullRegenerationTime matches wax', () => {
    for (const [max, current, age] of MANABAR_SAMPLES) {
      const sample = `${max} ${current} ${age}`;
      expect(calculateManabarFullRegenerationTime(NOW, max, current, NOW - age)).to.equal(
        waxChain.calculateManabarFullRegenerationTime(NOW, max, current, NOW - age),
        sample
      );
    }
  });

  it('an empty manabar (max 0) is full, as in wax', () => {
    expect(calculateCurrentManabarValue(NOW, '0', '0', NOW)).to.deep.equal(waxChain.calculateCurrentManabarValue(NOW, '0', '0', NOW));
  });
});

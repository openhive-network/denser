import { expect } from 'chai';
import { EXTENDED_REST_API_DEFINITION } from '@hive/common-hiveio-packages/wax';
import { createReadClient, IReadTransport, JsonRpcApiError } from './read-client';
import { vestsToHiveSatoshis } from '../../ui/lib/asset-math';

/**
 * The wasm-free read client and the asset math that replaced wax calls must give the same results
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
  vestsToHp(vests: INaiAsset, totalVestingFundHive: INaiAsset, totalVestingShares: INaiAsset): INaiAsset;
}
interface IWaxModule {
  createHiveChain(options: object): Promise<IWaxChain>;
  RequestHelper: new () => IReadTransport;
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

describe('wasm-free reads and asset math are equivalent to wax', function () {
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
      transport: new wax.RequestHelper(),
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
    ]
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

  it('an HTTP 5xx rejects both with the same wax transport error class', async () => {
    globalThis.fetch = createFakeFetch(() => ({ status: 503, body: { message: 'unavailable' } })).fakeFetch as typeof fetch;
    const waxError = await waxChain.api.bridge.get_post({ author: 'a', permlink: 'p', observer: '' }).catch((error: unknown) => error);
    const readError = await readClient.api.bridge.get_post({ author: 'a', permlink: 'p', observer: '' }).catch((error: unknown) => error);

    expect(waxError).to.be.instanceOf(wax.WaxRequestError);
    expect(readError).to.be.instanceOf(wax.WaxRequestError);
    expect((readError as Error).constructor).to.equal((waxError as Error).constructor);
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
    expect(readError).to.be.instanceOf(JsonRpcApiError).and.not.instanceOf(wax.WaxRequestError);
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
});

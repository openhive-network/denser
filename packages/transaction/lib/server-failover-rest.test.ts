import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import { createReadClient, type IReadClientConfig } from './read-client';
import { fetchReadTransport, ReadTransportError, isRestApiUnavailable } from './read-transport';
import { NODE_COOLDOWN_MS, NodeHealth } from './node-health';
import { wrapChainWithServerFailover } from './server-failover';

/**
 * The read chain's REST failover over real sockets, as the server and the browser run it: a node
 * without balance-api answers its paths with 404 and serves everything else.
 */

type RestCall = (params: Record<string, unknown>) => Promise<unknown>;
type ReadApi = { bridge: { get_profile: (params: unknown) => Promise<unknown> } };
type ReadRestApi = {
  'balance-api': { accountDelegations: RestCall };
  'hafah-api': { 'operation-types': RestCall };
  'hivesense-api': { posts: { search: RestCall } };
};

const REST_API_DEFINITION = {
  'balance-api': { accountDelegations: { urlPath: 'accounts/{account-name}/delegations' } },
  'hafah-api': { 'operation-types': { urlPath: 'operation-types' } },
  'hivesense-api': { posts: { search: { urlPath: 'posts/search' } } }
};

const DELEGATIONS = { outgoing_delegations: [], incoming_delegations: [{ delegator: 'bob' }] };

interface IStubNode {
  url: string;
  requests: string[];
  /** Status answered to every `/balance-api/…` request; 200 serves DELEGATIONS. */
  balanceApiStatus: number;
}

const listen = (server: Server): Promise<string> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address: AddressInfo | string | null = server.address();
      if (typeof address === 'object' && address) resolve(`http://127.0.0.1:${address.port}`);
    });
  });

const answer = (response: ServerResponse, status: number, body: unknown) => {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
};

const startStubNode = async (): Promise<{ node: IStubNode; server: Server }> => {
  const node: IStubNode = { url: '', requests: [], balanceApiStatus: 200 };
  const handle = (request: IncomingMessage, response: ServerResponse) => {
    const path = request.url ?? '/';
    node.requests.push(request.method === 'POST' ? 'json-rpc' : path);
    if (request.method === 'POST') return answer(response, 200, { jsonrpc: '2.0', result: { node: node.url }, id: 1 });
    if (path.startsWith('/balance-api/')) {
      return node.balanceApiStatus === 200
        ? answer(response, 200, DELEGATIONS)
        : answer(response, node.balanceApiStatus, { message: 'Not found' });
    }
    if (path === '/hafah-api/operation-types') return answer(response, 200, [{ node: node.url }]);
    return answer(response, 404, { message: 'Not found' });
  };
  const server = createServer((request, response) => {
    request.resume().on('end', () => handle(request, response));
  });
  node.url = await listen(server);
  return { node, server };
};

describe('server failover of REST reads', function () {
  this.timeout(15_000);

  let servers: Server[] = [];
  let lacking: IStubNode;
  let serving: IStubNode;
  let healthTime = 0;
  let health: NodeHealth;

  before(async () => {
    const started = await Promise.all([startStubNode(), startStubNode()]);
    servers = started.map(({ server }) => server);
    [lacking, serving] = started.map(({ node }) => node);
  });

  after(async () => {
    await Promise.all(
      servers.map((server) => {
        server.closeAllConnections();
        return new Promise<void>((resolve) => server.close(() => resolve()));
      })
    );
  });

  beforeEach(() => {
    healthTime = 0;
    health = new NodeHealth({ now: () => healthTime });
    for (const node of [lacking, serving]) {
      node.requests.length = 0;
      node.balanceApiStatus = 200;
    }
    lacking.balanceApiStatus = 404;
  });

  const createChain = (primary = lacking.url, restEndpoints?: IReadClientConfig['restEndpoints']) => {
    const createNodeChain = (node: string, timeoutMs: number) =>
      createReadClient<ReadApi, ReadRestApi>({
        getConfig: () => ({ chainId: 'beeab0de', apiEndpoint: node, restApiEndpoint: node, timeoutMs, restEndpoints }),
        transport: fetchReadTransport,
        restApiDefinition: REST_API_DEFINITION
      });
    return wrapChainWithServerFailover(createNodeChain(primary, 5_000), {
      fallbackNodes: [lacking.url, serving.url],
      createNodeChain,
      health,
      isTransportError: (error) => error instanceof ReadTransportError,
      isRestApiUnavailable
    });
  };

  const delegations = (chain: ReturnType<typeof createChain>) =>
    chain.restApi['balance-api'].accountDelegations({ 'account-name': 'alice' });

  it('serves a REST API the primary lacks from the next node, asking the primary once', async () => {
    const result = await delegations(createChain());

    expect(result).to.deep.equal(DELEGATIONS);
    expect(lacking.requests).to.deep.equal(['/balance-api/accounts/alice/delegations']);
    expect(serving.requests).to.deep.equal(['/balance-api/accounts/alice/delegations']);
  });

  it('skips the node for that REST API only, until its cooldown ends', async () => {
    const chain = createChain();
    await delegations(chain);
    lacking.requests.length = 0;

    expect(await delegations(chain)).to.deep.equal(DELEGATIONS);
    expect(await chain.restApi['hafah-api']['operation-types']({})).to.deep.equal([{ node: lacking.url }]);
    expect(await chain.api.bridge.get_profile({ account: 'alice' })).to.deep.equal({ node: lacking.url });
    expect(lacking.requests).to.deep.equal(['/hafah-api/operation-types', 'json-rpc']);

    healthTime += NODE_COOLDOWN_MS;
    lacking.balanceApiStatus = 200;
    lacking.requests.length = 0;

    expect(await delegations(chain)).to.deep.equal(DELEGATIONS);
    expect(lacking.requests).to.deep.equal(['/balance-api/accounts/alice/delegations']);
  });

  it('also fails over a 5xx', async () => {
    lacking.balanceApiStatus = 503;

    expect(await delegations(createChain())).to.deep.equal(DELEGATIONS);
    expect(serving.requests).to.have.length(1);
  });

  it('rejects with the 404 when no node serves the REST API', async () => {
    serving.balanceApiStatus = 404;

    const error = await delegations(createChain()).catch((e: unknown) => e);

    expect(error).to.be.instanceOf(ReadTransportError).with.property('status', 404);
    expect(lacking.requests).to.have.length(1);
    expect(serving.requests).to.have.length(1);
  });

  it('never fails over a request the API rejected', async () => {
    lacking.balanceApiStatus = 400;

    const error = await delegations(createChain()).catch((e: unknown) => e);

    expect(error).to.be.instanceOf(ReadTransportError).with.property('status', 400);
    expect(serving.requests).to.deep.equal([]);
  });

  it('does not fail over a REST API with an endpoint of its own', async () => {
    const chain = createChain(lacking.url, { 'hivesense-api': lacking.url + '/hivesense-api' });

    const error = await chain.restApi['hivesense-api'].posts.search({}).catch((e: unknown) => e);

    expect(error).to.be.instanceOf(ReadTransportError).with.property('status', 404);
    expect(serving.requests).to.deep.equal([]);
  });
});

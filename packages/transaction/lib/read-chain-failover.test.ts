import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import { getReadChain } from './chain';
import { getHiveChainService } from './hive-chain-service';
import { ReadTransportError } from './read-transport';

/**
 * `getReadChain()` and `getReadChain().withTimeout(n)` as the wallet reads with them: over real
 * sockets, between two allowed API nodes. The node health a case leaves behind is shared by every
 * read chain of the process, so a case that needs a healthy primary runs before any case that may
 * mark the primary's REST API down.
 */

const SLOW_CALL_TIMEOUT_MS = 3_000;

interface IStubNode {
  url: string;
  requests: string[];
  /** Status answered to every request of a REST API, by API name; any other API is served. */
  statusByApi: Record<string, number>;
  /** Status answered to one request path (without its query), overriding `statusByApi`. */
  statusByPath: Record<string, number>;
}

const listen = (server: Server): Promise<string> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address: AddressInfo | string | null = server.address();
      if (typeof address === 'object' && address) resolve(`http://127.0.0.1:${address.port}`);
    });
  });

const startStubNode = async (): Promise<{ node: IStubNode; server: Server }> => {
  const node: IStubNode = { url: '', requests: [], statusByApi: {}, statusByPath: {} };
  const handle = (request: IncomingMessage, response: ServerResponse) => {
    const path = request.url ?? '/';
    node.requests.push(path);
    const status = node.statusByPath[path.split('?')[0]] ?? node.statusByApi[path.split('/')[1]] ?? 200;
    response.writeHead(status, { 'content-type': 'application/json' });
    response.end(JSON.stringify(status === 200 ? { node: node.url } : { message: 'Not served' }));
  };
  const server = createServer((request, response) => {
    request.resume().on('end', () => handle(request, response));
  });
  node.url = await listen(server);
  return { node, server };
};

describe('getReadChain() REST failover', function () {
  this.timeout(15_000);

  let servers: Server[] = [];
  let primary: IStubNode;
  let second: IStubNode;

  before(async () => {
    const started = await Promise.all([startStubNode(), startStubNode()]);
    servers = started.map(({ server }) => server);
    [primary, second] = started.map(({ node }) => node);
    process.env.REACT_APP_ALLOWED_HIVE_API_NODES = `${primary.url} ${second.url}`;
    getHiveChainService().getApiEndpoints = () => ({
      chainId: 'beeab0de',
      apiEndpoint: primary.url,
      restApiEndpoint: primary.url,
      apiTimeout: 2_000,
      aiEndpoint: `${primary.url}/hivesense-api`
    });
  });

  after(async () => {
    delete process.env.REACT_APP_ALLOWED_HIVE_API_NODES;
    await Promise.all(
      servers.map((server) => {
        server.closeAllConnections();
        return new Promise<void>((resolve) => server.close(() => resolve()));
      })
    );
  });

  beforeEach(() => {
    for (const node of [primary, second]) {
      node.requests.length = 0;
      node.statusByApi = {};
      node.statusByPath = {};
    }
  });

  it('takes a 404 of proposal payments as the primary lacking the endpoint, still asking it for the rest of balance-api', async () => {
    primary.statusByPath['/balance-api/proposals/payments'] = 404;

    const error = await getReadChain()
      .restApi['balance-api'].proposalsPayments({ 'proposal-ids': '1,2' })
      .catch((e: unknown) => e);
    const delegations = await getReadChain().restApi['balance-api'].accountDelegations({ 'account-name': 'alice' });

    expect(error).to.be.instanceOf(ReadTransportError).with.property('status', 404);
    expect(delegations).to.deep.equal({ node: primary.url });
    expect(primary.requests).to.deep.equal([
      '/balance-api/proposals/payments?proposal-ids=1%2C2',
      '/balance-api/accounts/alice/delegations'
    ]);
    expect(second.requests).to.deep.equal([]);
  });

  const slowChain = () => getReadChain().withTimeout(SLOW_CALL_TIMEOUT_MS);

  it('serves account history from the next node when the primary answers 404', async () => {
    primary.statusByApi['hivemind-api'] = 404;

    const result = await slowChain().restApi['hivemind-api'].accountsOperations({ 'account-name': 'alice' });

    expect(result).to.deep.equal({ node: second.url });
    expect(primary.requests).to.deep.equal(['/hivemind-api/accounts/alice/operations']);
    expect(second.requests).to.deep.equal(['/hivemind-api/accounts/alice/operations']);
  });

  it('fails over a 5xx of the primary as well', async () => {
    primary.statusByApi['balance-api'] = 503;

    const result = await slowChain().restApi['balance-api'].accountDelegations({ 'account-name': 'alice' });

    expect(result).to.deep.equal({ node: second.url });
    expect(primary.requests).to.have.length(1);
  });

  it('rejects with the 5xx when every node fails, asking each node once', async () => {
    primary.statusByApi['hafah-api'] = 500;
    second.statusByApi['hafah-api'] = 500;

    const error = await slowChain()
      .restApi['hafah-api']['operation-types']({})
      .catch((e: unknown) => e);

    expect(error).to.be.instanceOf(ReadTransportError).with.property('status', 500);
    expect(primary.requests).to.deep.equal(['/hafah-api/operation-types']);
    expect(second.requests).to.deep.equal(['/hafah-api/operation-types']);
  });
});

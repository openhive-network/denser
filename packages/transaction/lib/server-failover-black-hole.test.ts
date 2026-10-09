import { createServer as createHttpServer, type Server } from 'node:http';
import { createServer as createTcpServer, type AddressInfo, type Socket } from 'node:net';
import { after, before, describe, it } from 'mocha';
import { expect } from 'chai';
import { createReadClient } from './read-client';
import { fetchReadTransport } from './read-transport';
import { NodeHealth } from './node-health';
import { FAILOVER_ATTEMPT_TIMEOUT_MS, wrapChainWithServerFailover } from './server-failover';

/**
 * The read chain the server uses, over real sockets: the primary accepts connections and never
 * answers, the fallback answers at once. Only the first call may pay for the dead primary.
 */

type BridgeApi = { bridge: { get_profile: (params: unknown) => Promise<unknown> } };

const BASE_TIMEOUT_MS = 500;

const listen = (server: Server | ReturnType<typeof createTcpServer>): Promise<string> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address: AddressInfo | string | null = server.address();
      if (typeof address === 'object' && address) resolve(`http://127.0.0.1:${address.port}`);
    });
  });

const close = (server: Server | ReturnType<typeof createTcpServer>): Promise<void> =>
  new Promise((resolve) => server.close(() => resolve()));

const createChain = (apiEndpoint: string, timeoutMs: number) =>
  createReadClient<BridgeApi, object>({
    getConfig: () => ({ chainId: 'beeab0de', apiEndpoint, restApiEndpoint: apiEndpoint, timeoutMs }),
    transport: fetchReadTransport,
    restApiDefinition: {}
  });

const timed = async (call: () => Promise<unknown>) => {
  const startedAt = Date.now();
  const result = await call();
  return { result, ms: Date.now() - startedAt };
};

describe('server failover with a black-holed primary', function () {
  this.timeout(15_000);

  const heldSockets: Socket[] = [];
  const blackHole = createTcpServer((socket) => heldSockets.push(socket));
  const fallback = createHttpServer((request, response) => {
    request.resume().on('end', () => {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ jsonrpc: '2.0', result: { name: 'alice' }, id: 1 }));
    });
  });
  let primaryUrl = '';
  let fallbackUrl = '';

  before(async () => {
    [primaryUrl, fallbackUrl] = await Promise.all([listen(blackHole), listen(fallback)]);
  });

  after(async () => {
    heldSockets.forEach((socket) => socket.destroy());
    fallback.closeAllConnections();
    await Promise.all([close(blackHole), close(fallback)]);
  });

  it('pays the attempt timeout once, then serves every call in one fallback round trip', async () => {
    const chain = wrapChainWithServerFailover(createChain(primaryUrl, BASE_TIMEOUT_MS), {
      fallbackNodes: [primaryUrl, fallbackUrl],
      createNodeChain: createChain,
      health: new NodeHealth()
    });
    const getProfile = () => chain.api.bridge.get_profile({ account: 'alice' });

    const first = await timed(getProfile);
    const later = [await timed(getProfile), await timed(getProfile), await timed(getProfile)];

    expect(first.result).to.deep.equal({ name: 'alice' });
    expect(first.ms).to.be.at.least(BASE_TIMEOUT_MS + FAILOVER_ATTEMPT_TIMEOUT_MS);
    for (const { result, ms } of later) {
      expect(result).to.deep.equal({ name: 'alice' });
      expect(ms).to.be.below(BASE_TIMEOUT_MS);
    }
  });
});

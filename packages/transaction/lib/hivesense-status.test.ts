import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, afterEach, before, beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import { logger } from '@ui/lib/logger';
import { getHiveSenseStatus } from './hivesense-api';
import { getHiveChainService } from './hive-chain-service';

/**
 * `getHiveSenseStatus` over a real socket, against a HiveSense node that answers every request
 * with the status, content type and raw body a case sets.
 */

interface IStubHiveSense {
  url: string;
  requests: string[];
  status: number;
  contentType: string;
  body: string;
}

const startStubHiveSense = (): Promise<{ node: IStubHiveSense; server: Server }> => {
  const node: IStubHiveSense = { url: '', requests: [], status: 200, contentType: 'application/json', body: '' };
  const server = createServer((request, response) => {
    request.resume().on('end', () => {
      node.requests.push(request.url ?? '/');
      response.writeHead(node.status, { 'content-type': node.contentType });
      response.end(node.body);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address: AddressInfo | string | null = server.address();
      if (typeof address === 'object' && address) node.url = `http://127.0.0.1:${address.port}`;
      resolve({ node, server });
    });
  });
};

const SYNCED_BODY = JSON.stringify({ last_block_num: 111179054, last_block_time: '2026-10-28T21:56:00' });

describe('getHiveSenseStatus', function () {
  this.timeout(15_000);

  let server: Server;
  let hiveSense: IStubHiveSense;
  let aiEndpoint: string;
  let originalGetAiSearchEndpoint: ReturnType<typeof getHiveChainService>['getAiSearchEndpoint'];
  let loggedErrors: unknown[][];

  before(async () => {
    ({ node: hiveSense, server } = await startStubHiveSense());
    originalGetAiSearchEndpoint = getHiveChainService().getAiSearchEndpoint;
    getHiveChainService().getAiSearchEndpoint = () => aiEndpoint;
  });

  after(async () => {
    getHiveChainService().getAiSearchEndpoint = originalGetAiSearchEndpoint;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    aiEndpoint = `${hiveSense.url}/`;
    hiveSense.requests.length = 0;
    hiveSense.status = 200;
    hiveSense.contentType = 'application/json';
    hiveSense.body = SYNCED_BODY;
    loggedErrors = [];
    Object.defineProperty(logger, 'error', {
      configurable: true,
      value: (...args: unknown[]) => loggedErrors.push(args)
    });
  });

  afterEach(() => {
    delete (logger as { error?: unknown }).error;
  });

  it('is available when sync-status reports a processed block, with sync-status the only request', async () => {
    expect(await getHiveSenseStatus()).to.equal(true);
    expect(hiveSense.requests).to.deep.equal(['/hivesense-api/sync-status']);
  });

  it('is unavailable before the node has processed its first block', async () => {
    hiveSense.body = JSON.stringify({ last_block_num: 0, last_block_time: null });

    expect(await getHiveSenseStatus()).to.equal(false);
  });

  it('is unavailable when sync-status answers a non-2xx', async () => {
    hiveSense.status = 503;

    expect(await getHiveSenseStatus()).to.equal(false);
    expect(hiveSense.requests).to.deep.equal(['/hivesense-api/sync-status']);
  });

  it('is unavailable when a 200 body is not the sync-status shape', async () => {
    hiveSense.body = JSON.stringify([{ author: 'alice', permlink: 'hello' }]);

    expect(await getHiveSenseStatus()).to.equal(false);
  });

  it('is unavailable, and logs, when the 200 body is not JSON', async () => {
    hiveSense.contentType = 'text/html';
    hiveSense.body = '<html><body>404 Not Found</body></html>';

    expect(await getHiveSenseStatus()).to.equal(false);
    expect(loggedErrors).to.have.length(1);
  });

  it('is unavailable, and logs, when the node cannot be reached', async () => {
    aiEndpoint = 'http://127.0.0.1:1';

    expect(await getHiveSenseStatus()).to.equal(false);
    expect(loggedErrors).to.have.length(1);
  });
});

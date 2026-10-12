import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, afterEach, before, beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import { logger } from '@ui/lib/logger';
import { getSimilarPostsByPost } from './hivesense-api';
import { getHiveChainService } from './hive-chain-service';
import { shouldRetryHiveSenseQuery } from './hivesense-search';

/**
 * `getSimilarPostsByPost` over a real socket, against a HiveSense node that answers every request
 * with the status and body a case sets.
 *
 * The read chain is a process-wide singleton that fixes its fallback nodes when first created, and
 * `read-chain-failover.test.ts` needs to create it: this file's name keeps it loading after that one.
 */

const NO_EMBEDDING_BODY = {
  code: 'P0001',
  details: null,
  hint: null,
  message: 'Post @alice/short-post has no stored embedding (too short or not yet processed)'
};

interface IStubHiveSense {
  url: string;
  requests: string[];
  status: number;
  body: unknown;
}

const startStubHiveSense = (): Promise<{ node: IStubHiveSense; server: Server }> => {
  const node: IStubHiveSense = { url: '', requests: [], status: 200, body: [] };
  const server = createServer((request, response) => {
    request.resume().on('end', () => {
      node.requests.push(request.url ?? '/');
      response.writeHead(node.status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(node.body));
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

describe('getSimilarPostsByPost', function () {
  this.timeout(15_000);

  let server: Server;
  let hiveSense: IStubHiveSense;
  let originalGetApiEndpoints: ReturnType<typeof getHiveChainService>['getApiEndpoints'];
  let loggedErrors: unknown[][];

  const getSimilar = () => getSimilarPostsByPost({ author: 'alice', permlink: 'short-post', observer: 'hive.blog' });

  before(async () => {
    ({ node: hiveSense, server } = await startStubHiveSense());
    originalGetApiEndpoints = getHiveChainService().getApiEndpoints;
    getHiveChainService().getApiEndpoints = () => ({
      chainId: 'beeab0de',
      apiEndpoint: hiveSense.url,
      restApiEndpoint: hiveSense.url,
      apiTimeout: 2_000,
      aiEndpoint: hiveSense.url
    });
  });

  after(async () => {
    getHiveChainService().getApiEndpoints = originalGetApiEndpoints;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    hiveSense.requests.length = 0;
    loggedErrors = [];
    Object.defineProperty(logger, 'error', {
      configurable: true,
      value: (...args: unknown[]) => loggedErrors.push(args)
    });
  });

  afterEach(() => {
    delete (logger as { error?: unknown }).error;
  });

  it('returns the similar posts HiveSense answers', async () => {
    hiveSense.status = 200;
    hiveSense.body = [{ author: 'bob', permlink: 'similar' }];

    expect(await getSimilar()).to.deep.equal([{ author: 'bob', permlink: 'similar' }]);
    expect(hiveSense.requests).to.have.length(1);
    expect(hiveSense.requests[0]).to.match(/^\/hivesense-api\/posts\/alice\/short-post\/similar\?/);
  });

  it('returns no results and logs nothing when the post has no stored embedding', async () => {
    hiveSense.status = 400;
    hiveSense.body = NO_EMBEDDING_BODY;

    expect(await getSimilar()).to.equal(null);
    expect(hiveSense.requests).to.have.length(1);
    expect(loggedErrors).to.deep.equal([]);
  });

  it('rejects and logs any other 400, and the query does not retry it', async () => {
    hiveSense.status = 400;
    hiveSense.body = { code: 'P0001', details: null, hint: null, message: 'Invalid result_limit' };

    const error = await getSimilar().catch((e: unknown) => e);

    expect(error).to.be.instanceOf(Error).with.property('message', 'Error in getSimilarPostsByPost');
    expect(loggedErrors).to.have.length(1);
    expect(shouldRetryHiveSenseQuery(0, error)).to.equal(false);
  });

  it('rejects and logs a 5xx, and the query retries it', async () => {
    hiveSense.status = 503;
    hiveSense.body = { message: 'Service unavailable' };

    const error = await getSimilar().catch((e: unknown) => e);

    expect(error).to.be.instanceOf(Error).with.property('message', 'Error in getSimilarPostsByPost');
    expect(loggedErrors).to.have.length(1);
    expect(shouldRetryHiveSenseQuery(0, error)).to.equal(true);
    expect(shouldRetryHiveSenseQuery(3, error)).to.equal(false);
  });
});

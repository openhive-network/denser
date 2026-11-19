import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, afterEach, before, beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import { logger } from '@ui/lib/logger';
import { getPostsByIds, getSimilarPosts, searchPosts } from './hivesense-api';
import { getHiveChainService } from './hive-chain-service';

/**
 * `getSimilarPosts` (and, for the viewer's vote, `searchPosts` and `getPostsByIds`) over a real socket, against a node
 * that answers every HiveSense request with the status and body a case sets, after the delay it sets, and every
 * JSON-RPC call to its root (hivemind's `search-api.find_similar`) with the result or error a case sets.
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
  delayMs: number;
  rpcCalls: Array<{ method: string; params: unknown }>;
  rpcAnswer: { result: unknown } | { error: unknown };
}

const UNKNOWN_METHOD_ERROR = {
  code: -32602,
  message: 'Assert Exception:unknown method: search-apifind_similar',
  data: { name: 'assert_exception' }
};

const answerRpc = (node: IStubHiveSense, rawBody: string): string => {
  const { method, params, id } = JSON.parse(rawBody);
  node.rpcCalls.push({ method, params });
  return JSON.stringify({ jsonrpc: '2.0', id, ...node.rpcAnswer });
};

const startStubHiveSense = (): Promise<{ node: IStubHiveSense; server: Server }> => {
  const node: IStubHiveSense = {
    url: '',
    requests: [],
    status: 200,
    body: [],
    delayMs: 0,
    rpcCalls: [],
    rpcAnswer: { result: [] }
  };
  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      if (request.method === 'POST' && request.url === '/') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(answerRpc(node, Buffer.concat(chunks).toString()));
        return;
      }
      node.requests.push(request.url ?? '/');
      setTimeout(() => {
        response.writeHead(node.status, { 'content-type': 'application/json' });
        response.end(JSON.stringify(node.body));
      }, node.delayMs);
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

const CONFIGURED_TIMEOUT_MS = 2_000;

describe('getSimilarPosts', function () {
  this.timeout(15_000);

  let server: Server;
  let hiveSense: IStubHiveSense;
  let originalGetApiEndpoints: ReturnType<typeof getHiveChainService>['getApiEndpoints'];
  let loggedErrors: unknown[][];
  let loggedWarnings: unknown[][];

  const similarParams = { author: 'alice', permlink: 'short-post', observer: 'hive.blog', result_limit: 10 };
  const getSimilar = (hiveSenseAvailable = true) => getSimilarPosts({ ...similarParams, hiveSenseAvailable });
  const findSimilarCall = {
    method: 'search-api.find_similar',
    params: { author: 'alice', permlink: 'short-post', limit: 10, observer: 'hive.blog' }
  };
  const textPost = { author: 'dave', permlink: 'lexical', title: 'Lexical', body: 'text', active_votes: [] };

  before(async () => {
    ({ node: hiveSense, server } = await startStubHiveSense());
    originalGetApiEndpoints = getHiveChainService().getApiEndpoints;
    getHiveChainService().getApiEndpoints = () => ({
      chainId: 'beeab0de',
      apiEndpoint: hiveSense.url,
      restApiEndpoint: hiveSense.url,
      apiTimeout: CONFIGURED_TIMEOUT_MS,
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
    hiveSense.delayMs = 0;
    hiveSense.rpcCalls.length = 0;
    hiveSense.rpcAnswer = { result: [textPost] };
    loggedErrors = [];
    loggedWarnings = [];
    Object.defineProperty(logger, 'error', {
      configurable: true,
      value: (...args: unknown[]) => loggedErrors.push(args)
    });
    Object.defineProperty(logger, 'warn', {
      configurable: true,
      value: (...args: unknown[]) => loggedWarnings.push(args)
    });
  });

  afterEach(() => {
    delete (logger as { error?: unknown }).error;
    delete (logger as { warn?: unknown }).warn;
  });

  it('returns the similar posts HiveSense answers, without asking hivemind', async () => {
    hiveSense.status = 200;
    hiveSense.body = [{ author: 'bob', permlink: 'similar' }];

    expect(await getSimilar()).to.deep.equal({ source: 'hivesense', posts: [{ author: 'bob', permlink: 'similar' }] });
    expect(hiveSense.requests).to.have.length(1);
    expect(hiveSense.requests[0]).to.match(/^\/hivesense-api\/posts\/alice\/short-post\/similar\?/);
    expect(hiveSense.rpcCalls).to.deep.equal([]);
  });

  it('returns no results and logs nothing when the post has no stored embedding', async () => {
    hiveSense.status = 400;
    hiveSense.body = NO_EMBEDDING_BODY;

    expect(await getSimilar()).to.equal(null);
    expect(hiveSense.requests).to.have.length(1);
    expect(hiveSense.rpcCalls).to.deep.equal([]);
    expect(loggedErrors).to.deep.equal([]);
  });

  it("asks only hivemind's find_similar when HiveSense is unavailable", async () => {
    expect(await getSimilar(false)).to.deep.equal({ source: 'text', posts: [textPost] });
    expect(hiveSense.requests).to.deep.equal([]);
    expect(hiveSense.rpcCalls).to.deep.equal([findSimilarCall]);
  });

  it('waits for a cold query past the configured request timeout', async () => {
    hiveSense.status = 200;
    hiveSense.body = [{ author: 'bob', permlink: 'similar' }];
    hiveSense.delayMs = CONFIGURED_TIMEOUT_MS + 500;

    expect(await getSimilar()).to.deep.equal({ source: 'hivesense', posts: [{ author: 'bob', permlink: 'similar' }] });
    expect(hiveSense.requests).to.have.length(1);
    expect(hiveSense.rpcCalls).to.deep.equal([]);
  });

  it('falls back to find_similar once and warns on any other 400', async () => {
    hiveSense.status = 400;
    hiveSense.body = { code: 'P0001', details: null, hint: null, message: 'Invalid result_limit' };

    expect(await getSimilar()).to.have.property('source', 'text');
    expect(hiveSense.rpcCalls).to.deep.equal([findSimilarCall]);
    expect(loggedWarnings).to.have.length(1);
    expect(loggedErrors).to.deep.equal([]);
  });

  it('falls back to find_similar once and warns on a 5xx', async () => {
    hiveSense.status = 503;
    hiveSense.body = { message: 'Service unavailable' };

    expect(await getSimilar()).to.have.nested.property('posts[0].permlink', 'lexical');
    expect(hiveSense.requests).to.have.length(1);
    expect(hiveSense.rpcCalls).to.deep.equal([findSimilarCall]);
    expect(loggedWarnings).to.have.length(1);
    expect(loggedWarnings[0][0]).to.be.instanceOf(Error).with.property('status', 503);
    expect(loggedErrors).to.deep.equal([]);
  });

  it('returns no results, warning only, when HiveSense and find_similar both fail', async () => {
    hiveSense.status = 503;
    hiveSense.body = { message: 'Service unavailable' };
    hiveSense.rpcAnswer = { error: { code: -32603, message: 'Internal Error' } };

    expect(await getSimilar()).to.equal(null);
    expect(hiveSense.rpcCalls).to.deep.equal([findSimilarCall]);
    expect(loggedWarnings).to.have.length(2);
    expect(loggedErrors).to.deep.equal([]);
  });

  it('returns no results, warning only, when hivemind answers find_similar with "unknown method"', async () => {
    hiveSense.rpcAnswer = { error: UNKNOWN_METHOD_ERROR };

    expect(await getSimilar(false)).to.equal(null);
    expect(hiveSense.rpcCalls).to.deep.equal([findSimilarCall]);
    expect(loggedWarnings).to.have.length(1);
    expect(loggedErrors).to.deep.equal([]);
  });

  describe("the viewer's vote on HiveSense's full posts", () => {
    const fullPost = { author: 'bob', permlink: 'similar', title: 'Similar', body: 'text' };
    const stub = { author: 'carol', permlink: 'stub' };
    const viewerVote = { rshares: 1200, percent: 5000 };
    const withVotes = { ...fullPost, active_votes: [{ voter: 'hive.blog', rshares: 1200, percent: 5000 }] };
    const reads = {
      similar: async () => (await getSimilar())?.posts ?? null,
      search: () => searchPosts({ query: 'solar array', observer: 'hive.blog' }),
      byIds: () => getPostsByIds({ posts: [fullPost, stub], observer: 'hive.blog' })
    };

    for (const [name, read] of Object.entries(reads)) {
      it(`${name}: carries a vote-free post's observer_vote as the observer's, a stub as it came`, async () => {
        hiveSense.status = 200;
        hiveSense.body = [{ ...fullPost, observer_vote: viewerVote }, { ...fullPost, permlink: 'unvoted' }, stub];

        const posts = await read();

        expect(posts?.filter((post) => post.permlink !== 'stub')).to.deep.equal([
          { ...fullPost, observer_vote: viewerVote, _observer: 'hive.blog' },
          { ...fullPost, permlink: 'unvoted', observer_vote: null, _observer: 'hive.blog' }
        ]);
        // getPostsByIds drops stubs; the other reads keep them for a later by-ids page.
        if (name !== 'byIds') expect(posts?.[2]).to.deep.equal(stub);
      });

      it(`${name}: returns a post with its votes as it came`, async () => {
        hiveSense.status = 200;
        hiveSense.body = [withVotes];

        expect(await read()).to.deep.equal([withVotes]);
      });
    }
  });
});

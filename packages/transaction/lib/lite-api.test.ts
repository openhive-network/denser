import { describe, it } from 'mocha';
import type { Entry, ILiteProfile } from '@hive/common-hiveio-packages/wax';
import { expect } from 'chai';
import {
  createLiteApiProbe,
  createLiteNotificationsReader,
  createLiteProfileReader,
  createLiteSocialReader,
  createPostsReader,
  findLiteNode,
  liteSocialApp,
  LITE_PROBE_TTL_MS,
  LITE_READ_BUDGET_MS,
  LITE_READ_COOLDOWN_MS,
  postsReadOptionsOf,
  readLiteProbeTtlMs,
  readLiteReadBudgetMs,
  type ILiteNotificationsApi,
  type IPostsReaderOptions,
  type ILiteSocialApi,
  type TPostsApi
} from './lite-api';
import { accountOfDid, toFollow } from './lite-social-api';
import { JsonRpcApiError } from './read-client';
import { ReadTransportError } from './read-transport';

const LITE_NODE = 'https://lite.example';
const STOCK_NODE = 'https://stock.example';

const LITE_INFO = {
  version: '1.0',
  modes: ['compat', 'native'],
  render_base: 'https://hive.blog',
  apps: { posts: 'lite_posts' },
  methods: ['get_discussion', 'get_post', 'get_ranked_posts', 'get_account_posts']
};

const apiNotFound = (method: string) =>
  new JsonRpcApiError(method, { jsonrpc: '2.0', id: 1, error: { code: -32601, message: 'Api not found lite' } });

/** A probe whose nodes answer from `answers` (an Error is thrown), counting the requests per node. */
const setupProbe = (answers: Record<string, unknown>) => {
  let time = 0;
  const requests: string[] = [];
  const probe = createLiteApiProbe({
    now: () => time,
    fetchInfo: async (endpoint) => {
      requests.push(endpoint);
      const answer = answers[endpoint];
      if (answer instanceof Error) throw answer;
      return answer;
    }
  });
  return {
    probe,
    requests,
    advance: (ms: number) => {
      time += ms;
    }
  };
};

describe('createLiteApiProbe', () => {
  it('answers a lite-aware node with its info and asks it once within the TTL', async () => {
    const { probe, requests, advance } = setupProbe({ [LITE_NODE]: LITE_INFO });

    expect(await probe.getInfo(LITE_NODE)).to.deep.equal(LITE_INFO);
    advance(LITE_PROBE_TTL_MS - 1);
    expect(await probe.getInfo(LITE_NODE)).to.deep.equal(LITE_INFO);

    expect(requests).to.deep.equal([LITE_NODE]);
  });

  it('shares one request between concurrent callers', async () => {
    const { probe, requests } = setupProbe({ [LITE_NODE]: LITE_INFO });

    await Promise.all([probe.getInfo(LITE_NODE), probe.getInfo(LITE_NODE)]);

    expect(requests).to.deep.equal([LITE_NODE]);
  });

  it('keeps a transport failure only for the read cooldown, "Api not found" for the whole TTL', async () => {
    const down = new ReadTransportError('fetch failed', { method: 'POST', endpoint: LITE_NODE, url: '', timeout: 1, responseType: 'json' });
    const answers: Record<string, unknown> = { [LITE_NODE]: down, [STOCK_NODE]: apiNotFound('lite.get_info') };
    const { probe, requests, advance } = setupProbe(answers);

    expect(await probe.getInfo(LITE_NODE)).to.equal(null);
    expect(await probe.getInfo(STOCK_NODE)).to.equal(null);
    expect(probe.hasUnreachableNode()).to.equal(true);
    answers[LITE_NODE] = LITE_INFO;
    advance(LITE_READ_COOLDOWN_MS - 1);
    expect(await probe.getInfo(LITE_NODE)).to.equal(null);
    advance(1);
    expect(probe.hasUnreachableNode()).to.equal(false);
    expect(await probe.getInfo(LITE_NODE)).to.deep.equal(LITE_INFO);
    expect(await probe.getInfo(STOCK_NODE)).to.equal(null);

    expect(requests).to.deep.equal([LITE_NODE, STOCK_NODE, LITE_NODE]);
  });

  it('caches "Api not found", a transport failure and a malformed answer as not lite-aware', async () => {
    const nodes = {
      [STOCK_NODE]: apiNotFound('lite.get_info'),
      'https://down.example': new ReadTransportError('fetch failed', { method: 'POST', endpoint: 'https://down.example', url: '', timeout: 1, responseType: 'json' }),
      'https://compat-only.example': { ...LITE_INFO, modes: ['compat'] },
      'https://garbage.example': 'ok'
    };
    const { probe, requests } = setupProbe(nodes);

    for (const node of Object.keys(nodes)) {
      expect(await probe.getInfo(node), node).to.equal(null);
      expect(await probe.getInfo(node), node).to.equal(null);
    }

    expect(requests).to.deep.equal(Object.keys(nodes));
  });

  it('asks the node again once the TTL has passed', async () => {
    const answers: Record<string, unknown> = { [LITE_NODE]: apiNotFound('lite.get_info') };
    const { probe, requests, advance } = setupProbe(answers);

    expect(await probe.getInfo(LITE_NODE)).to.equal(null);
    answers[LITE_NODE] = LITE_INFO;
    advance(LITE_PROBE_TTL_MS);

    expect(await probe.getInfo(LITE_NODE)).to.deep.equal(LITE_INFO);
    expect(requests).to.deep.equal([LITE_NODE, LITE_NODE]);
  });

  it('keeps one answer per endpoint, so a node change is probed on its own', async () => {
    const { probe, requests } = setupProbe({ [LITE_NODE]: LITE_INFO, [STOCK_NODE]: apiNotFound('lite.get_info') });

    expect(await probe.getInfo(LITE_NODE)).to.deep.equal(LITE_INFO);
    expect(await probe.getInfo(STOCK_NODE)).to.equal(null);
    expect(await probe.getInfo(LITE_NODE)).to.deep.equal(LITE_INFO);

    expect(requests).to.deep.equal([LITE_NODE, STOCK_NODE]);
  });
  it('answers a seeded endpoint without asking it, and asks every other endpoint itself', async () => {
    const { probe, requests } = setupProbe({ [LITE_NODE]: LITE_INFO, [STOCK_NODE]: apiNotFound('lite.get_info') });

    probe.seed(LITE_NODE, LITE_INFO);

    expect(probe.peek(LITE_NODE)).to.deep.equal(LITE_INFO);
    expect(probe.peek(STOCK_NODE)).to.equal(undefined);
    expect(await probe.getInfo(LITE_NODE)).to.deep.equal(LITE_INFO);
    expect(await probe.getInfo(STOCK_NODE)).to.equal(null);
    expect(requests).to.deep.equal([STOCK_NODE]);
  });

  it('takes a malformed seed as not lite-aware and asks the node again once the seed expires', async () => {
    const { probe, requests, advance } = setupProbe({ [LITE_NODE]: LITE_INFO });

    probe.seed(LITE_NODE, { ...LITE_INFO, modes: ['compat'] });

    expect(await probe.getInfo(LITE_NODE)).to.equal(null);
    advance(LITE_PROBE_TTL_MS);
    expect(await probe.getInfo(LITE_NODE)).to.deep.equal(LITE_INFO);
    expect(requests).to.deep.equal([LITE_NODE]);
  });

  it('notifies subscribers of a seed and of an answer, until they unsubscribe', async () => {
    const { probe } = setupProbe({ [LITE_NODE]: LITE_INFO, [STOCK_NODE]: apiNotFound('lite.get_info') });
    const seen: unknown[] = [];
    const unsubscribe = probe.subscribe(() => seen.push(probe.peek(LITE_NODE)));

    await probe.getInfo(LITE_NODE);
    expect(seen).to.deep.equal([LITE_INFO]);

    unsubscribe();
    await probe.getInfo(STOCK_NODE);
    expect(seen).to.have.length(1);
  });
});

describe('readLiteProbeTtlMs', () => {
  it('reads DENSER_LITE_PROBE_TTL_S in seconds, 0 included', () => {
    expect(readLiteProbeTtlMs({ DENSER_LITE_PROBE_TTL_S: '0' })).to.equal(0);
    expect(readLiteProbeTtlMs({ DENSER_LITE_PROBE_TTL_S: '2.5' })).to.equal(2_500);
  });

  it('falls back to the default when unset, empty or not a non-negative number', () => {
    for (const value of [undefined, '', ' ', '-1', 'soon']) {
      expect(readLiteProbeTtlMs({ DENSER_LITE_PROBE_TTL_S: value }), String(value)).to.equal(LITE_PROBE_TTL_MS);
    }
  });
});

describe('readLiteReadBudgetMs', () => {
  it('reads DENSER_LITE_READ_BUDGET_S in seconds', () => {
    expect(readLiteReadBudgetMs({ DENSER_LITE_READ_BUDGET_S: '1.5' })).to.equal(1_500);
  });

  it('keeps the default when unset, not positive or not a number', () => {
    for (const value of [undefined, '', '0', '-1', 'soon']) {
      expect(readLiteReadBudgetMs({ DENSER_LITE_READ_BUDGET_S: value }), String(value)).to.equal(LITE_READ_BUDGET_MS);
    }
  });
});

describe('findLiteNode', () => {
  it('finds the first lite-aware node of the lite set, asking the first one alone', async () => {
    const { probe, requests } = setupProbe({ [STOCK_NODE]: apiNotFound('lite.get_info'), [LITE_NODE]: LITE_INFO });

    expect(await findLiteNode([LITE_NODE, STOCK_NODE], probe)).to.deep.equal({ node: LITE_NODE, info: LITE_INFO });
    expect(requests).to.deep.equal([LITE_NODE]);
  });

  it('asks the other nodes when the first is not lite-aware, and keeps their order', async () => {
    const other = 'https://other.example';
    const { probe, requests } = setupProbe({
      [STOCK_NODE]: apiNotFound('lite.get_info'),
      [other]: LITE_INFO,
      [LITE_NODE]: LITE_INFO
    });

    expect(await findLiteNode([STOCK_NODE, other, LITE_NODE], probe)).to.deep.equal({ node: other, info: LITE_INFO });
    expect(requests).to.have.members([STOCK_NODE, other, LITE_NODE]);
  });

  it('answers null when no node of the set is lite-aware, or the set has no node', async () => {
    const { probe } = setupProbe({ [STOCK_NODE]: apiNotFound('lite.get_info') });

    expect(await findLiteNode([STOCK_NODE], probe)).to.equal(null);
    expect(await findLiteNode([], probe)).to.equal(null);
  });

  it("lets post reads go through lite.* when the lite set's node is not the chain's own", async () => {
    const calls: string[] = [];
    const postsApi = (namespace: string): TPostsApi =>
      // The fakes record their params as given; the real wax types are not what is under test.
      ({
        get_post: async () => {
          calls.push(`${namespace}.get_post`);
          return namespace;
        }
      }) as unknown as TPostsApi;
    const api = { lite: postsApi('lite'), bridge: postsApi('bridge') };
    const chain = { endpointUrl: STOCK_NODE, api, withTimeout: () => ({ api }) };
    const { probe, requests } = setupProbe({ [STOCK_NODE]: apiNotFound('lite.get_info'), [LITE_NODE]: LITE_INFO });
    const read = createPostsReader(() => chain, probe, () => findLiteNode([LITE_NODE, STOCK_NODE], probe));

    expect(await read((api) => api.get_post({ author: 'did:lite:bob', permlink: 'p', observer: '' }))).to.equal('lite');
    expect(calls).to.deep.equal(['lite.get_post']);
    expect(requests).to.deep.equal([LITE_NODE]);
  });
});

describe('createLiteApiProbe with known answers', () => {
  it("takes a node's known answer (the API sets engine's probe) instead of asking it", async () => {
    const requests: string[] = [];
    const known: Record<string, { info: unknown }> = {
      [LITE_NODE]: { info: LITE_INFO },
      [STOCK_NODE]: { info: null }
    };
    const probe = createLiteApiProbe({
      fetchInfo: async (endpoint) => {
        requests.push(endpoint);
        return LITE_INFO;
      },
      knownInfo: (endpoint) => known[endpoint]
    });

    expect(await probe.getInfo(LITE_NODE)).to.deep.equal(LITE_INFO);
    expect(await probe.getInfo(STOCK_NODE)).to.equal(null);
    expect(await probe.getInfo('https://unknown.example')).to.deep.equal(LITE_INFO);
    expect(requests).to.deep.equal(['https://unknown.example']);
  });
});

describe('createPostsReader', () => {
  /** A chain whose `lite` and `bridge` post reads record their calls and answer with `answers`. */
  const setupReader = (
    endpoint: string,
    probeAnswers: Record<string, unknown>,
    liteAnswer: unknown = 'native',
    options: IPostsReaderOptions = {}
  ) => {
    const calls: string[] = [];
    const timeouts: number[] = [];
    const postsApi = (namespace: string, answer: () => unknown): TPostsApi => {
      const call = (method: string) => async (params: unknown) => {
        calls.push(`${namespace}.${method} ${JSON.stringify(params)}`);
        const value = answer();
        if (value instanceof Error) throw value;
        return value;
      };
      // The fakes record their params as given; the real wax types are not what is under test.
      return {
        get_discussion: call('get_discussion'),
        get_post: call('get_post'),
        get_ranked_posts: call('get_ranked_posts'),
        get_account_posts: call('get_account_posts')
      } as unknown as TPostsApi;
    };
    const answerLite = () => (typeof liteAnswer === 'function' ? liteAnswer() : liteAnswer);
    const api = { lite: postsApi('lite', answerLite), bridge: postsApi('bridge', () => 'compat') };
    const chain = {
      endpointUrl: endpoint,
      api,
      withTimeout: (timeoutMs: number) => {
        timeouts.push(timeoutMs);
        return { api };
      }
    };
    const { probe, requests } = setupProbe(probeAnswers);
    const read = createPostsReader(() => chain, probe, undefined, options);
    return { read, calls, probeRequests: requests, probe, timeouts };
  };

  const getPost = (api: TPostsApi) => api.get_post({ author: 'did:lite:bob', permlink: 'p', observer: 'hive.blog' });
  const trending = { sort: 'trending', tag: '', start_author: '', start_permlink: '', limit: 20, observer: 'hive.blog' };

  it('reads through lite.* when the current node is lite-aware', async () => {
    const { read, calls } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO });

    expect(await read(getPost)).to.equal('native');
    expect(calls).to.deep.equal(['lite.get_post {"author":"did:lite:bob","permlink":"p","observer":"hive.blog"}']);
  });

  it('reads through bridge.* when the current node is not lite-aware', async () => {
    const { read, calls } = setupReader(STOCK_NODE, { [STOCK_NODE]: apiNotFound('lite.get_info') });

    expect(await read((api) => api.get_ranked_posts(trending))).to.equal('compat');
    expect(calls).to.deep.equal([`bridge.get_ranked_posts ${JSON.stringify(trending)}`]);
  });

  it('reads the stock way (hivemind REST or bridge.*) when given one and the node is not lite-aware', async () => {
    const { read, calls } = setupReader(STOCK_NODE, { [STOCK_NODE]: apiNotFound('lite.get_info') });

    expect(await read((api) => api.get_ranked_posts(trending), async () => 'stock' as unknown as Entry[])).to.equal('stock');
    expect(calls).to.deep.equal([]);
  });

  it('prefers lite.* over the stock read on a lite-aware node, and takes the stock read when lite.* goes', async () => {
    const { read, calls } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO }, apiNotFound('lite.get_ranked_posts'));

    expect(await read((api) => api.get_ranked_posts(trending), async () => 'stock' as unknown as Entry[])).to.equal('stock');
    expect(calls).to.deep.equal([`lite.get_ranked_posts ${JSON.stringify(trending)}`]);
  });

  it('falls back to bridge.* and stops probing when the node no longer serves lite.*', async () => {
    const { read, calls, probeRequests } = setupReader(
      LITE_NODE,
      { [LITE_NODE]: LITE_INFO },
      apiNotFound('lite.get_post')
    );

    expect(await read(getPost)).to.equal('compat');
    expect(await read(getPost)).to.equal('compat');

    expect(calls.map((call) => call.split(' ')[0])).to.deep.equal(['lite.get_post', 'bridge.get_post', 'bridge.get_post']);
    expect(probeRequests).to.deep.equal([LITE_NODE]);
  });

  it('marks the node that answered "Api not found", not the lite node failover started from', async () => {
    const OTHER_LITE_NODE = 'https://other-lite.example';
    const answeredByOther = new JsonRpcApiError(
      'lite.get_post',
      { error: { code: -32601, message: 'Api not found lite' } },
      OTHER_LITE_NODE
    );
    const { read, probe } = setupReader(
      LITE_NODE,
      { [LITE_NODE]: LITE_INFO, [OTHER_LITE_NODE]: LITE_INFO },
      answeredByOther
    );
    await probe.getInfo(OTHER_LITE_NODE);

    expect(await read(getPost)).to.equal('compat');
    expect(probe.peek(OTHER_LITE_NODE)).to.equal(null);
    expect(probe.peek(LITE_NODE)).to.deep.equal(LITE_INFO);
  });

  it('probes the node once, on the first read, and notifies its answer', async () => {
    const { read, calls, probeRequests, probe } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO });
    let notified = 0;
    probe.subscribe(() => notified++);

    expect(probeRequests).to.deep.equal([]);
    await read(getPost);
    await read(getPost);

    expect(probeRequests).to.deep.equal([LITE_NODE]);
    expect(notified).to.be.greaterThan(0);
    expect(probe.peek(LITE_NODE)).to.deep.equal(LITE_INFO);
    expect(calls.map((call) => call.split(' ')[0])).to.deep.equal(['lite.get_post', 'lite.get_post']);
  });

  it('reads a seeded lite-aware node through lite.* without probing it', async () => {
    const { read, calls, probeRequests, probe } = setupReader(LITE_NODE, { [LITE_NODE]: apiNotFound('lite.get_info') });
    probe.seed(LITE_NODE, LITE_INFO);

    await read(getPost);

    expect(probeRequests).to.deep.equal([]);
    expect(calls.map((call) => call.split(' ')[0])).to.deep.equal(['lite.get_post']);
  });

  const transportError = (message: string, status?: number) =>
    new ReadTransportError(
      message,
      { method: 'POST', endpoint: LITE_NODE, url: '', timeout: LITE_READ_BUDGET_MS, responseType: 'json' },
      status
    );
  const namesOf = (calls: readonly string[]) => calls.map((call) => call.split(' ')[0]);

  it('reads the stock way when the lite node times out, without marking it not lite-aware', async () => {
    const timeout = transportError('The operation was aborted due to timeout');
    const { read, calls, probe } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO }, timeout);

    expect(await read((api) => api.get_ranked_posts(trending), async () => 'stock' as unknown as Entry[])).to.equal('stock');
    expect(namesOf(calls)).to.deep.equal(['lite.get_ranked_posts']);
    expect(probe.peek(LITE_NODE)).to.deep.equal(LITE_INFO);
  });

  it('reads through bridge.* when the lite node answers with a 5xx', async () => {
    const { read, calls } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO }, transportError('Bad Gateway', 502));

    expect(await read(getPost)).to.equal('compat');
    expect(namesOf(calls)).to.deep.equal(['lite.get_post', 'bridge.get_post']);
  });

  it('gives the lite read its budget, as its request timeout too, then reads the stock way', async () => {
    const never = new Promise<never>(() => undefined);
    const { read, calls, timeouts } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO }, never, { budgetMs: 20 });
    const startedAt = Date.now();

    expect(await read(getPost)).to.equal('compat');
    expect(Date.now() - startedAt).to.be.lessThan(1_000);
    expect(timeouts).to.deep.equal([20]);
    expect(namesOf(calls)).to.deep.equal(['lite.get_post', 'bridge.get_post']);
  });

  it('skips lite.* on the node for the cooldown after a transport failure, then reads it again', async () => {
    let time = 0;
    const answers: unknown[] = [transportError('fetch failed'), 'native'];
    const { read, calls } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO }, () => answers.shift(), {
      cooldownMs: 30_000,
      now: () => time
    });

    expect(await read(getPost)).to.equal('compat');
    time += 29_999;
    expect(await read(getPost)).to.equal('compat');
    time += 1;
    expect(await read(getPost)).to.equal('native');

    expect(namesOf(calls)).to.deep.equal(['lite.get_post', 'bridge.get_post', 'bridge.get_post', 'lite.get_post']);
  });

  it('rethrows a transport failure of a did:lite: post read instead of reading bridge.*', async () => {
    const timeout = transportError('The operation was aborted due to timeout');
    const { read, calls } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO }, timeout);

    const error = await read(getPost, undefined, postsReadOptionsOf('did:lite:bob')).catch((e: unknown) => e);

    expect(error).to.equal(timeout);
    expect(namesOf(calls)).to.deep.equal(['lite.get_post']);
  });

  it('rethrows an overrun budget of a did:lite: post read as a transport error', async () => {
    const never = new Promise<never>(() => undefined);
    const { read, calls } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO }, never, { budgetMs: 20 });

    const error = await read(getPost, undefined, { liteOnly: true }).catch((e: unknown) => e);

    expect(error).to.be.instanceOf(ReadTransportError);
    expect(error instanceof ReadTransportError && error.request.endpoint).to.equal(LITE_NODE);
    expect(namesOf(calls)).to.deep.equal(['lite.get_post']);
  });

  it('asks lite.* for a did:lite: post during the cooldown, which a feed read skips', async () => {
    let time = 0;
    const answers: unknown[] = [transportError('fetch failed'), 'native'];
    const { read, calls } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO }, () => answers.shift(), {
      now: () => time
    });

    expect(await read((api) => api.get_ranked_posts(trending))).to.equal('compat');
    time += 1;
    expect(await read((api) => api.get_ranked_posts(trending))).to.equal('compat');
    expect(await read(getPost, undefined, { liteOnly: true })).to.equal('native');

    expect(namesOf(calls)).to.deep.equal([
      'lite.get_ranked_posts',
      'bridge.get_ranked_posts',
      'bridge.get_ranked_posts',
      'lite.get_post'
    ]);
  });

  it('marks only did:lite: authors as read through lite.* alone', () => {
    expect(postsReadOptionsOf('did:lite:bob')).to.deep.equal({ liteOnly: true });
    expect(postsReadOptionsOf('bob')).to.deep.equal({ liteOnly: false });
  });

  it('bounds the lookup of the lite node by the budget, then reads the stock way', async () => {
    const chainCalls: string[] = [];
    const bridge = {
      get_ranked_posts: async () => {
        chainCalls.push('bridge.get_ranked_posts');
        return 'compat';
      }
    } as unknown as TPostsApi;
    const api = { lite: bridge, bridge };
    const chain = { endpointUrl: LITE_NODE, api, withTimeout: () => ({ api }) };
    const stalledLookup = () => new Promise<never>(() => undefined);
    const read = createPostsReader(() => chain, setupProbe({}).probe, stalledLookup, { budgetMs: 20 });
    const startedAt = Date.now();

    expect(await read((posts) => posts.get_ranked_posts(trending))).to.equal('compat');
    expect(Date.now() - startedAt).to.be.lessThan(1_000);
    const error = await read(getPost, undefined, { liteOnly: true }).catch((e: unknown) => e);
    expect(error).to.be.instanceOf(ReadTransportError);
    expect(chainCalls).to.deep.equal(['bridge.get_ranked_posts']);
  });

  it('shares one budget between the lookup of the lite node and the lite.* read', async () => {
    const never = new Promise<never>(() => undefined);
    const { probe } = setupProbe({ [LITE_NODE]: LITE_INFO });
    const calls: string[] = [];
    const postsApi = (namespace: string, answer: () => Promise<unknown>) =>
      ({
        get_post: () => {
          calls.push(`${namespace}.get_post`);
          return answer();
        }
      }) as unknown as TPostsApi;
    const api = { lite: postsApi('lite', () => never), bridge: postsApi('bridge', async () => 'compat') };
    const chain = { endpointUrl: LITE_NODE, api, withTimeout: () => ({ api }) };
    const slowLookup = () =>
      new Promise<{ node: string; info: typeof LITE_INFO }>((resolve) =>
        setTimeout(() => resolve({ node: LITE_NODE, info: LITE_INFO }), 60)
      );
    const read = createPostsReader(() => chain, probe, slowLookup, { budgetMs: 100 });
    const startedAt = Date.now();

    expect(await read(getPost)).to.equal('compat');
    // The read had what was left of the budget after the lookup, not a budget of its own.
    expect(Date.now() - startedAt).to.be.lessThan(140);
    expect(calls).to.deep.equal(['lite.get_post', 'bridge.get_post']);
  });

  it('rethrows for a did:lite: post when no node is lite-aware while one could not be asked', async () => {
    const down = transportError('fetch failed');
    const { read, calls } = setupReader(LITE_NODE, { [LITE_NODE]: down });

    expect(await read((api) => api.get_ranked_posts(trending))).to.equal('compat');
    const error = await read(getPost, undefined, { liteOnly: true }).catch((e: unknown) => e);

    expect(error).to.be.instanceOf(ReadTransportError);
    expect(namesOf(calls)).to.deep.equal(['bridge.get_ranked_posts']);
  });

  it('reads a did:lite: post the stock way when the node answered "Api not found"', async () => {
    const { read, calls } = setupReader(STOCK_NODE, { [STOCK_NODE]: apiNotFound('lite.get_info') });

    expect(await read(getPost, undefined, { liteOnly: true })).to.equal('compat');
    expect(namesOf(calls)).to.deep.equal(['bridge.get_post']);
  });

  it('rejects with the lite.* answer when it is an answer of the API itself', async () => {
    const missing = new JsonRpcApiError('lite.get_post', { error: { code: -32602, message: 'Post does not exist' } });
    const { read, calls } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO }, missing);

    const error = await read(getPost).catch((e: unknown) => e);

    expect(error).to.equal(missing);
    expect(calls).to.have.length(1);
  });
});

describe('createLiteProfileReader', () => {
  const PROFILE: ILiteProfile = {
    id: -1,
    name: 'did:lite:bob',
    created: '2026-10-16T18:37:48',
    active: '2026-10-16T19:54:18',
    post_count: 4,
    reputation: 25,
    blacklists: [],
    stats: { rank: 0, followers: 0, following: 0 },
    metadata: { profile: { name: 'bob' } }
  };
  const PROFILE_INFO = { ...LITE_INFO, methods: [...LITE_INFO.methods, 'get_profile'] };

  /** A chain whose `lite.get_profile` records its calls and answers with `answer` (an Error is thrown). */
  const setupProfileReader = (probeAnswers: Record<string, unknown>, answer: ILiteProfile | Error = PROFILE) => {
    const calls: string[] = [];
    const chain = {
      endpointUrl: LITE_NODE,
      api: {
        lite: {
          get_profile: async (params: { account: string }): Promise<ILiteProfile> => {
            calls.push(params.account);
            if (answer instanceof Error) throw answer;
            return answer;
          }
        }
      }
    };
    const { probe } = setupProbe(probeAnswers);
    return { read: createLiteProfileReader(() => chain, probe), calls };
  };

  it('asks a node that lists lite.get_profile', async () => {
    const { read, calls } = setupProfileReader({ [LITE_NODE]: PROFILE_INFO });

    expect(await read('did:lite:bob')).to.deep.equal(PROFILE);
    expect(calls).to.deep.equal(['did:lite:bob']);
  });

  it('answers null without asking a node that is not lite-aware or does not list the method', async () => {
    for (const info of [apiNotFound('lite.get_info'), LITE_INFO]) {
      const { read, calls } = setupProfileReader({ [LITE_NODE]: info });

      expect(await read('did:lite:bob')).to.equal(null);
      expect(calls).to.deep.equal([]);
    }
  });

  it('answers null for an API error such as an account that does not exist', async () => {
    const missing = new JsonRpcApiError('lite.get_profile', {
      error: { code: -32602, message: 'Assert Exception:[{"did:lite:bob": "account does not exist"}]' }
    });
    const { read } = setupProfileReader({ [LITE_NODE]: PROFILE_INFO }, missing);

    expect(await read('did:lite:bob')).to.equal(null);
  });

  it('rejects with a transport failure, which says nothing about the account', async () => {
    const failure = new ReadTransportError('timeout', { method: 'POST', endpoint: LITE_NODE, url: '', timeout: 1, responseType: 'json' });
    const { read } = setupProfileReader({ [LITE_NODE]: PROFILE_INFO }, failure);

    expect(await read('did:lite:bob').catch((e: unknown) => e)).to.equal(failure);
  });
});

describe('createLiteSocialReader', () => {
  const SOCIAL_INFO = { ...LITE_INFO, apps: { posts: 'lite_posts_test', social: 'lite_social_test' } };
  const ROWS = [{ what: ['blog'], follower: 'did:lite:bob', following: 'alice' }];

  /** A chain whose `lite.get_followers` records its calls and answers ROWS. */
  const setupSocialReader = (probeAnswers: Record<string, unknown>) => {
    const calls: unknown[] = [];
    const unused = async (): Promise<never> => {
      throw new Error('not asked');
    };
    const lite: ILiteSocialApi = {
      get_followers: async (params) => {
        calls.push(params);
        return ROWS;
      },
      get_following: unused,
      get_follow_count: unused,
      list_subscribers: unused,
      list_all_subscriptions: unused
    };
    const { probe } = setupProbe(probeAnswers);
    return { read: createLiteSocialReader(() => ({ endpointUrl: LITE_NODE, api: { lite } }), probe), calls };
  };
  const params = { account: 'alice', start: null, type: 'blog', limit: 50 };

  it('reads the social graph of a node whose lite.get_info advertises apps.social', async () => {
    const { read, calls } = setupSocialReader({ [LITE_NODE]: SOCIAL_INFO });

    expect(await read((api) => api.get_followers(params))).to.deep.equal(ROWS);
    expect(calls).to.deep.equal([params]);
  });

  it('answers null without asking a lite-aware node without the social app, or a stock node', async () => {
    for (const info of [LITE_INFO, { ...LITE_INFO, apps: { posts: 'lite_posts', social: '' } }, apiNotFound('lite.get_info')]) {
      const { read, calls } = setupSocialReader({ [LITE_NODE]: info });

      expect(await read((api) => api.get_followers(params))).to.equal(null);
      expect(calls).to.deep.equal([]);
    }
  });

  it('names the social app only when it is advertised', () => {
    expect(liteSocialApp(SOCIAL_INFO)).to.equal('lite_social_test');
    expect(liteSocialApp(LITE_INFO)).to.equal(null);
    expect(liteSocialApp(null)).to.equal(null);
  });
});

describe('createLiteNotificationsReader', () => {
  const NOTIFY_INFO = {
    ...LITE_INFO,
    apps: { posts: 'lite_posts_test', social: 'lite_social_test' },
    methods: [...LITE_INFO.methods, 'account_notifications', 'unread_notifications', 'lookup_accounts']
  };
  const ROWS = [{ id: '89481685581692929', msg: '@did:lite:bob followed you', url: '@did:lite:bob', date: '2026-10-16T19:54:15', type: 'follow', score: 15 }];

  /** A chain whose `lite.account_notifications` records its calls and answers ROWS. */
  const setupNotificationsReader = (probeAnswers: Record<string, unknown>) => {
    const calls: unknown[] = [];
    const lite: ILiteNotificationsApi = {
      account_notifications: async (params) => {
        calls.push(params);
        return ROWS;
      },
      unread_notifications: async () => ({ lastread: '2026-10-16 00:00:00', unread: 1 }),
      lookup_accounts: async () => ['did:lite:bob']
    };
    const { probe } = setupProbe(probeAnswers);
    return { read: createLiteNotificationsReader(() => ({ endpointUrl: LITE_NODE, api: { lite } }), probe), calls };
  };
  const params = { account: 'did:lite:alice', limit: 50 };

  it('reads lite.account_notifications of a node whose lite.get_info lists it', async () => {
    const { read, calls } = setupNotificationsReader({ [LITE_NODE]: NOTIFY_INFO });

    expect(await read((api) => api.account_notifications(params), async () => [])).to.deep.equal(ROWS);
    expect(calls).to.deep.equal([params]);
  });

  it('runs the fallback without asking a lite node without the method, or a stock node', async () => {
    const social = { ...LITE_INFO, apps: { posts: 'lite_posts', social: 'lite_social' } };
    for (const info of [LITE_INFO, social, apiNotFound('lite.get_info')]) {
      const { read, calls } = setupNotificationsReader({ [LITE_NODE]: info });

      expect(await read<unknown>((api) => api.account_notifications(params), async () => 'stock' as unknown as Entry[])).to.equal('stock');
      expect(calls).to.deep.equal([]);
    }
  });
});

describe('lite social rows', () => {
  it('name Hive accounts by name and keep lite DIDs', () => {
    expect(accountOfDid('did:hive:test-gateway-1')).to.equal('test-gateway-1');
    expect(accountOfDid('did:lite:bob')).to.equal('did:lite:bob');
    expect(accountOfDid('alice')).to.equal('alice');
    expect(toFollow({ what: ['blog'], follower: 'did:lite:bob', following: 'did:hive:alice' })).to.deep.equal({
      follower: 'did:lite:bob',
      following: 'alice',
      what: ['blog']
    });
  });
});

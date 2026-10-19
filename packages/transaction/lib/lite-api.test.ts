import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createLiteApiProbe, createPostsReader, LITE_PROBE_TTL_MS, readLiteProbeTtlMs, type TPostsApi } from './lite-api';
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

describe('createPostsReader', () => {
  /** A chain whose `lite` and `bridge` post reads record their calls and answer with `answers`. */
  const setupReader = (endpoint: string, probeAnswers: Record<string, unknown>, liteAnswer: unknown = 'native') => {
    const calls: string[] = [];
    const postsApi = (namespace: string, answer: () => unknown): TPostsApi => {
      const call = (method: string) => async (params: unknown) => {
        calls.push(`${namespace}.${method} ${JSON.stringify(params)}`);
        const value = answer();
        if (value instanceof Error) throw value;
        return value;
      };
      return {
        get_discussion: call('get_discussion'),
        get_post: call('get_post'),
        get_ranked_posts: call('get_ranked_posts'),
        get_account_posts: call('get_account_posts')
      };
    };
    const chain = {
      endpointUrl: endpoint,
      api: { lite: postsApi('lite', () => liteAnswer), bridge: postsApi('bridge', () => 'compat') }
    };
    const { probe, requests } = setupProbe(probeAnswers);
    return { read: createPostsReader(() => chain, probe), calls, probeRequests: requests };
  };

  const getPost = (api: TPostsApi) => api.get_post({ author: 'did:lite:bob', permlink: 'p', observer: 'hive.blog' });

  it('reads through lite.* when the current node is lite-aware', async () => {
    const { read, calls } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO });

    expect(await read(getPost)).to.equal('native');
    expect(calls).to.deep.equal(['lite.get_post {"author":"did:lite:bob","permlink":"p","observer":"hive.blog"}']);
  });

  it('reads through bridge.* when the current node is not lite-aware', async () => {
    const { read, calls } = setupReader(STOCK_NODE, { [STOCK_NODE]: apiNotFound('lite.get_info') });

    expect(await read((api) => api.get_ranked_posts({ sort: 'trending' }))).to.equal('compat');
    expect(calls).to.deep.equal(['bridge.get_ranked_posts {"sort":"trending"}']);
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

  it('rejects with the lite.* answer when it is an answer of the API itself', async () => {
    const missing = new JsonRpcApiError('lite.get_post', { error: { code: -32602, message: 'Post does not exist' } });
    const { read, calls } = setupReader(LITE_NODE, { [LITE_NODE]: LITE_INFO }, missing);

    const error = await read(getPost).catch((e: unknown) => e);

    expect(error).to.equal(missing);
    expect(calls).to.have.length(1);
  });
});

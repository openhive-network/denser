import { afterEach, describe, it } from 'mocha';
import { expect } from 'chai';
import { TransportError, type ApiTransport } from '@hiveio/healthchecker-component/engine';
import { resolveApiSetsConfig, SELECTABLE_API_NODES } from '@ui/config/api-sets';
import { createApiSetEngine } from './definitions';
import { createEngineView } from './engine-view';
import { probeAnswerOf } from './probe-answers';

const FYP_URL = 'https://api.syncad.com/haf-fyp-api';
const FYP_PROBE_PATH = '/v1/fyp/feed/hive.blog?page=1&page-size=1';

/** A transport on which the For You URL serves the feed and every other node fails as CORS-less 404s do in a browser. */
const recordingTransport = (requests: string[]): ApiTransport => ({
  jsonRpc: async (node, method) => {
    requests.push(`${node} ${method}`);
    throw new TransportError(`${node}: network error`);
  },
  restGet: async (node, path) => {
    requests.push(`${node}${path}`);
    if (node === FYP_URL && path === FYP_PROBE_PATH) return { status: 200, body: [] };
    throw new TransportError(`${node}: network error`);
  }
});

describe('the For You API set', () => {
  it('asks only its For You URL, so the API nodes are unsupported, not down, and its calls go to the URL', async () => {
    const config = resolveApiSetsConfig({ fypApiUrl: FYP_URL }, ['fyp']);
    expect(config.nodes).to.include.members([FYP_URL, ...SELECTABLE_API_NODES]);
    const requests: string[] = [];
    const engine = createApiSetEngine(config, { transport: recordingTransport(requests) });

    await engine.refresh();

    expect(requests).to.deep.equal([`${FYP_URL}${FYP_PROBE_PATH}`]);
    const states = Object.fromEntries(
      engine.rankings('fyp').map(({ node, state, reason }) => [node, { state, reason }])
    );
    expect(states[FYP_URL]).to.deep.equal({ state: 'eligible', reason: undefined });
    for (const node of SELECTABLE_API_NODES) {
      expect(states[node], node).to.deep.equal({ state: 'unsupported', reason: 'not a For You API URL' });
    }
    expect(engine.bestNode('fyp')).to.equal(FYP_URL);
    expect(engine.fallbackOrder('fyp')).to.deep.equal([FYP_URL]);
  });
});

/** The server engine's probes against nodes answered by a stubbed `fetch`, as the component's transport sends them. */

const NO_LITE_NODE = 'https://api.hive.blog';
const LITE_NODE = 'https://api.syncad.com';

const UNMAPPED_ENDPOINT = {
  error: {
    code: -32603,
    error: 'Unable to map request to endpoint.',
    message: 'Unable to map request to endpoint.'
  },
  id: 1,
  jsonrpc: '2.0'
};

const LITE_INFO = { apps: { posts: 'lite_posts' }, methods: ['get_post', 'get_ranked_posts'] };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** `NO_LITE_NODE` routes no `lite.*` (HTTP 404, as hive's router answers); both serve core. */
const answer = (node: string, method: string): Response => {
  if (method === 'lite.get_info') {
    return node === NO_LITE_NODE ? json(UNMAPPED_ENDPOINT, 404) : json({ jsonrpc: '2.0', id: 1, result: LITE_INFO });
  }
  return json({ jsonrpc: '2.0', id: 1, result: { head_block_number: 1 } });
};

const stubFetch = () => {
  globalThis.fetch = (async (input: string | URL, init: RequestInit = {}) => {
    const node = String(input).replace(/\/+$/, '');
    const { method } = JSON.parse(String(init.body));
    return answer(node, method);
  }) as typeof fetch;
};

describe('the API set engine probing lite', () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('finds a node answering lite.get_info with 404 "Unable to map request to endpoint." unsupported, not down', async () => {
    stubFetch();
    const config = resolveApiSetsConfig({ apiEndpoint: NO_LITE_NODE, allowedNodes: `${NO_LITE_NODE} ${LITE_NODE}` }, [
      'core',
      'lite'
    ]);
    const engine = createApiSetEngine(config);
    await engine.refresh();

    const states = Object.fromEntries(engine.rankings('lite').map(({ node, state }) => [node, state]));
    expect(states[NO_LITE_NODE]).to.equal('unsupported');
    expect(states[LITE_NODE]).to.not.be.oneOf(['unsupported', 'down']);
    expect(probeAnswerOf('lite', NO_LITE_NODE, 60_000)).to.deep.equal({ answer: null });

    const view = createEngineView(engine, config);
    expect(view.nodesFor('lite')[0]).to.equal(LITE_NODE);
    expect(view.nodesFor('lite')).to.not.include(NO_LITE_NODE);
    expect(view.nodesFor('core')[0]).to.equal(NO_LITE_NODE);
  });

  it('routes lite to every preferred node before any probe or call, its default first', () => {
    const config = resolveApiSetsConfig({ apiEndpoint: NO_LITE_NODE, allowedNodes: `${NO_LITE_NODE} ${LITE_NODE}` }, [
      'core',
      'lite'
    ]);
    const engine = createApiSetEngine(config);
    engine.report('core', NO_LITE_NODE, { ok: true });

    const view = createEngineView(engine, config);
    expect(view.nodesFor('lite')).to.deep.equal([NO_LITE_NODE, LITE_NODE]);
  });
});

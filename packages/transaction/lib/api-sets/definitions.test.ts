import { describe, it } from 'mocha';
import { expect } from 'chai';
import { TransportError, type ApiTransport } from '@hiveio/healthchecker-component/engine';
import { resolveApiSetsConfig, SELECTABLE_API_NODES } from '@ui/config/api-sets';
import { createApiSetEngine } from './definitions';

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

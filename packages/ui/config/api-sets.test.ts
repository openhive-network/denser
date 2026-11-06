import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { ApiTransport, JsonRpcResponse, RestResponse } from '@hiveio/healthchecker-component/engine';
import {
  parseApiSetPreferences,
  resolveApiSetsConfig,
  SELECTABLE_API_NODES,
  selectionWithNodeUrls,
  serializeApiSetChoices,
  WALLET_API_SETS
} from './api-sets.ts';

// The transaction modules under test import the way the apps' bundler resolves them: through the
// `@ui/*` alias and without the extension node's type stripping needs.
const ALIASES: Record<string, string> = {
  '@ui/config/api-sets': new URL('./api-sets.ts', import.meta.url).href,
  '@ui/config/api-set-ids': new URL('./api-set-ids.ts', import.meta.url).href,
  '@ui/lib/logging': new URL('../../transaction/lib/__test-stubs__/ui-logging.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const alias = ALIASES[specifier];
    if (alias) return nextResolve(alias, context);
    if (
      specifier.startsWith('.') &&
      !/\.[cm]?[jt]sx?$/.test(specifier) &&
      context.parentURL?.endsWith('.ts')
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  }
});
const { ApiSetEngine, memoryStorage } = await import('@hiveio/healthchecker-component/engine');
const { createApiSetEngine } = await import('../../transaction/lib/api-sets/definitions.ts');
const { bootstrapOf, getApiSetView, provideApiSetView } = await import(
  '../../transaction/lib/api-sets/router.ts'
);
const { probeAnswerOf } = await import('../../transaction/lib/api-sets/probe-answers.ts');
const { createEngineView } = await import('../../transaction/lib/api-sets/engine-view.ts');
const { installServerApiSets } = await import('../../transaction/lib/api-sets/server.ts');

const HIVE_BLOG = 'https://api.hive.blog';
const SYNCAD = 'https://api.syncad.com';
const OPENHIVE = 'https://api.openhive.network';
const ANYX = 'https://anyx.io';

const MAINNET_ENV = { apiEndpoint: HIVE_BLOG, allowedNodes: `${HIVE_BLOG} ${SYNCAD} ${OPENHIVE}` };

const LITE_INFO = {
  version: '1',
  render_base: 'https://lite.example',
  modes: ['native'],
  methods: ['get_info', 'get_ranked_posts', 'get_profile'],
  apps: { posts: 'lite.posts', social: 'lite.social' }
};

const API_NOT_FOUND: JsonRpcResponse = { error: { code: -32601, message: 'Api not found lite' } };

/**
 * Nodes as the probes see them: every node serves the core and bridge APIs and the REST APIs,
 * `liteNodes` also `lite.*`, and `downNodes` answer nothing.
 */
const fakeTransport = ({ liteNodes = [SYNCAD], downNodes = [] as string[] } = {}): ApiTransport => ({
  jsonRpc: async (node: string, method: string): Promise<JsonRpcResponse> => {
    if (downNodes.includes(node)) throw new Error(`${node} is down`);
    if (method.startsWith('lite.')) return liteNodes.includes(node) ? { result: LITE_INFO } : API_NOT_FOUND;
    if (method.startsWith('bridge.')) {
      return {
        error: { code: -32602, message: 'Invalid parameters', data: 'Post hc-probe/hc-probe does not exist' }
      };
    }
    return { result: { head_block_number: 1 } };
  },
  restGet: async (node: string): Promise<RestResponse> => {
    if (downNodes.includes(node)) throw new Error(`${node} is down`);
    return { status: 200, body: {} };
  }
});

const probedEngine = async (
  env = MAINNET_ENV,
  transport = fakeTransport(),
  storage = memoryStorage()
): Promise<{
  engine: InstanceType<typeof ApiSetEngine>;
  config: ReturnType<typeof resolveApiSetsConfig>;
}> => {
  const config = resolveApiSetsConfig(env);
  const engine = createApiSetEngine(config, { transport, storage });
  await engine.refresh();
  return { engine, config };
};

describe('resolveApiSetsConfig', () => {
  it('prefers the API endpoint, then the allowed nodes, for core, bridge and lite', () => {
    const config = resolveApiSetsConfig({
      apiEndpoint: `${SYNCAD}/`,
      allowedNodes: `${HIVE_BLOG}, ${SYNCAD}`
    });
    assert.deepEqual(config.preferences.core, [SYNCAD, HIVE_BLOG]);
    assert.deepEqual(config.preferences.bridge, [SYNCAD, HIVE_BLOG]);
    assert.deepEqual(config.preferences.lite, [SYNCAD, HIVE_BLOG]);
  });

  it('routes hivemind REST and the For You feed only when they are configured', () => {
    assert.equal(resolveApiSetsConfig(MAINNET_ENV).sets.includes('hivemind-rest'), false);
    assert.equal(resolveApiSetsConfig(MAINNET_ENV).sets.includes('fyp'), false);
    const config = resolveApiSetsConfig({
      ...MAINNET_ENV,
      hivemindRestNodes: 'https://rest-a.example https://rest-b.example/',
      fypApiUrl: 'https://fyp.example/api/'
    });
    assert.deepEqual(config.preferences['hivemind-rest'], [
      'https://rest-a.example',
      'https://rest-b.example'
    ]);
    assert.deepEqual(config.preferences.fyp, ['https://fyp.example/api']);
    assert.ok(
      config.nodes.includes('https://rest-b.example') && config.nodes.includes('https://fyp.example/api')
    );
  });

  it('seeds hivesense from the AI domain and the REST APIs from the REST endpoint', () => {
    const config = resolveApiSetsConfig({ ...MAINNET_ENV, aiDomain: SYNCAD, restApiEndpoint: OPENHIVE });
    assert.deepEqual(config.preferences.hivesense, [SYNCAD]);
    assert.deepEqual(config.preferences['balance-api'], [OPENHIVE, HIVE_BLOG, SYNCAD]);
    assert.deepEqual(config.preferences.hafah, [OPENHIVE, HIVE_BLOG, SYNCAD]);
  });

  it('lets an explicit per-set order win, and keeps the selectable nodes in the catalog', () => {
    const config = resolveApiSetsConfig({ ...MAINNET_ENV, setPreferences: `lite=${SYNCAD}` });
    assert.deepEqual(config.preferences.lite, [SYNCAD]);
    assert.deepEqual(config.preferences.core, [HIVE_BLOG, SYNCAD, OPENHIVE]);
    for (const node of SELECTABLE_API_NODES) assert.ok(config.nodes.includes(node), node);
  });

  it('drops the images host from the nodes and keeps a scope to its sets', () => {
    const config = resolveApiSetsConfig(
      {
        ...MAINNET_ENV,
        allowedNodes: `${HIVE_BLOG} https://images.hive.blog`,
        excluded: ['https://images.hive.blog/']
      },
      WALLET_API_SETS
    );
    assert.deepEqual(config.sets, ['core', 'bridge', 'lite', 'balance-api', 'hafah']);
    assert.equal(config.nodes.includes('https://images.hive.blog'), false);
  });
});

describe('parseApiSetPreferences', () => {
  it('reads ranks of equal nodes and drops unknown sets and invalid nodes', () => {
    assert.deepEqual(
      parseApiSetPreferences(
        `bridge=${HIVE_BLOG} ${SYNCAD}|${OPENHIVE}/; nope=${HIVE_BLOG}; lite=ftp://x.example ${SYNCAD}`
      ),
      { bridge: [HIVE_BLOG, [SYNCAD, OPENHIVE]], lite: [SYNCAD] }
    );
  });
});

describe('routing by API set', () => {
  it('sends core and lite to different nodes when only one of them serves lite.*', async () => {
    const { engine, config } = await probedEngine();
    const view = createEngineView(engine, config);
    assert.equal(view.nodesFor('core')[0], HIVE_BLOG);
    assert.equal(view.nodesFor('bridge')[0], HIVE_BLOG);
    assert.deepEqual(view.nodesFor('lite'), [SYNCAD]);
  });

  it('splits the hivemind soft group when its sets have no common best node', async () => {
    const { engine } = await probedEngine();
    const group = engine.groups().find(({ group: name }) => name === 'hivemind');
    assert.ok(group);
    assert.equal(group.split, true);
    assert.deepEqual(group.nodesBySet, { bridge: HIVE_BLOG, lite: SYNCAD });
  });

  it('keeps the hivemind sets on one node when one of the best nodes serves them all', async () => {
    const { engine, config } = await probedEngine({
      ...MAINNET_ENV,
      setPreferences: `bridge=${HIVE_BLOG}|${SYNCAD}`
    });
    const view = createEngineView(engine, config);
    assert.equal(view.nodesFor('bridge')[0], SYNCAD);
    assert.equal(view.nodesFor('lite')[0], SYNCAD);
    assert.equal(engine.groups().find(({ group }) => group === 'hivemind')?.split, false);
  });

  it("fails over in the engine's order, the operator's nodes first, skipping a node that is down", async () => {
    const { engine, config } = await probedEngine(MAINNET_ENV, fakeTransport({ downNodes: [SYNCAD] }));
    const view = createEngineView(engine, config);
    const core = view.nodesFor('core');
    assert.deepEqual(core.slice(0, 2), [HIVE_BLOG, OPENHIVE]);
    assert.equal(core.includes(SYNCAD), false);
    // The only node serving lite is down: lite's calls still go to it, the others lack lite.*.
    assert.deepEqual(view.nodesFor('lite'), [SYNCAD]);
  });

  it("routes a set no node is known to serve to the operator's nodes, as its calls go", async () => {
    const config = resolveApiSetsConfig(MAINNET_ENV);
    const { engine } = await probedEngine(MAINNET_ENV, fakeTransport({ downNodes: config.nodes }));
    assert.deepEqual(engine.fallbackOrder('core'), []);
    const { routes } = bootstrapOf(createEngineView(engine, config));
    assert.deepEqual(routes.core, [HIVE_BLOG, SYNCAD, OPENHIVE]);
    assert.deepEqual(routes.bridge, [HIVE_BLOG, SYNCAD, OPENHIVE]);
    assert.deepEqual(routes.lite, [HIVE_BLOG, SYNCAD, OPENHIVE]);
  });

  it('routes to a catalog node the operator does not list once it serves the set, as /healthchecker shows', async () => {
    const { engine, config } = await probedEngine(
      { apiEndpoint: HIVE_BLOG, allowedNodes: HIVE_BLOG },
      fakeTransport({ liteNodes: [SYNCAD] })
    );
    assert.equal(config.preferences.lite.includes(SYNCAD), false);
    assert.equal(engine.bestNode('lite'), SYNCAD);
    assert.deepEqual(createEngineView(engine, config).nodesFor('lite'), [SYNCAD]);
    assert.equal(createEngineView(engine, config).nodesFor('core')[0], HIVE_BLOG);
  });

  it("keeps the For You feed's URL out of the other sets without asking it", async () => {
    const fyp = `${SYNCAD}/haf-fyp-api`;
    const asked: string[] = [];
    const transport = fakeTransport();
    const { engine } = await probedEngine(
      { ...MAINNET_ENV, fypApiUrl: fyp },
      {
        jsonRpc: async (node, method, params, timeoutMs) => {
          asked.push(node);
          return transport.jsonRpc(node, method, params, timeoutMs);
        },
        restGet: transport.restGet
      }
    );
    assert.equal(asked.includes(fyp), false);
    for (const setId of ['core', 'bridge', 'lite'] as const) {
      assert.equal(engine.rankings(setId).find(({ node }) => node === fyp)?.state, 'unsupported');
    }
    assert.equal(engine.bestNode('fyp'), fyp);
  });

  it('backs off a node users may pick that could not be reached, but not an operator node', async () => {
    let time = 0;
    const asked: string[] = [];
    const config = resolveApiSetsConfig(MAINNET_ENV, ['core']);
    const engine = createApiSetEngine(config, {
      storage: memoryStorage(),
      now: () => time,
      transport: {
        jsonRpc: async (node) => {
          asked.push(node);
          if (node === ANYX || node === OPENHIVE) throw new Error(`${node} is down`);
          return { result: { head_block_number: 1 } };
        },
        restGet: async () => ({ status: 200, body: {} })
      }
    });
    const askedOf = (node: string) => asked.filter((asked) => asked === node).length;
    await engine.refresh();
    for (const elapsedMs of [31_000, 31_000]) {
      time += elapsedMs;
      await engine.refresh();
    }
    // Asked at 0 s, backed off for 30 s, asked at 31 s, backed off for 60 s: not asked at 62 s.
    assert.equal(askedOf(ANYX), 2);
    assert.equal(askedOf(OPENHIVE), 3);
  });

  it("records the lite probe's lite.get_info answers for the lite reads", async () => {
    await probedEngine();
    assert.deepEqual(probeAnswerOf('lite', SYNCAD, 60_000), { answer: LITE_INFO });
    assert.deepEqual(probeAnswerOf('lite', HIVE_BLOG, 60_000), { answer: null });
    assert.equal(probeAnswerOf('lite', HIVE_BLOG, -1), undefined);
  });

  it("takes a user's node into the order of its set", async () => {
    const { engine, config } = await probedEngine();
    assert.equal(engine.select('core', ANYX), true);
    assert.deepEqual(createEngineView(engine, config).nodesFor('core').slice(0, 4), [
      ANYX,
      HIVE_BLOG,
      SYNCAD,
      OPENHIVE
    ]);
  });

  it('does not offer a node that does not serve the set', async () => {
    const { engine } = await probedEngine();
    assert.equal(engine.select('lite', HIVE_BLOG), false);
    assert.equal(engine.selection('lite'), 'auto');
  });

  it('learns from reported call outcomes: a node answering "Api not found" leaves the set', async () => {
    const { engine, config } = await probedEngine(
      MAINNET_ENV,
      fakeTransport({ liteNodes: [SYNCAD, OPENHIVE] })
    );
    const view = createEngineView(engine, config);
    assert.deepEqual(view.nodesFor('lite'), [SYNCAD, OPENHIVE]);
    view.report('lite', SYNCAD, { ok: false, error: 'apiNotFound' });
    assert.deepEqual(view.nodesFor('lite'), [OPENHIVE]);
  });
});

describe('the user choice across server and browser', () => {
  it("survives the cookie round trip and routes the server's render of that user", async () => {
    const { engine: shared, config } = await probedEngine();
    const browser = createApiSetEngine(config, { storage: memoryStorage() });
    assert.equal(browser.hydrateSnapshot(shared.snapshot()), true);
    assert.equal(browser.select('core', SYNCAD), true);

    const cookie = selectionWithNodeUrls(browser.serialize(), config.nodes);
    assert.equal(cookie, `v=1&s.core=${encodeURIComponent(SYNCAD)}`);
    const forUser = createEngineView(ApiSetEngine.forRequest(shared, cookie), config);
    const forOthers = createEngineView(shared, config);
    assert.equal(forUser.nodesFor('core')[0], SYNCAD);
    assert.equal(forUser.selectedNode('core'), SYNCAD);
    assert.equal(forOthers.nodesFor('core')[0], HIVE_BLOG);
    assert.equal(shared.selection('core'), 'auto');
  });

  it('routes each server request by its own cookie and reports outcomes to the shared engine', async () => {
    let cookie: string | undefined;
    const shared = installServerApiSets({
      app: 'blog',
      readCookie: async () => cookie,
      env: {
        REACT_APP_API_ENDPOINT: HIVE_BLOG,
        REACT_APP_ALLOWED_HIVE_API_NODES: `${HIVE_BLOG} ${SYNCAD}`,
        DENSER_API_SETS_PROBING: 'off'
      }
    });
    try {
      shared.report('lite', HIVE_BLOG, { ok: false, error: 'apiNotFound' });
      shared.report('lite', SYNCAD, { ok: true, latencyMs: 50 });
      shared.report('core', HIVE_BLOG, { ok: true, latencyMs: 50 });
      shared.report('core', SYNCAD, { ok: true, latencyMs: 50 });
      assert.deepEqual((await getApiSetView())?.nodesFor('lite'), [SYNCAD]);
      assert.equal((await getApiSetView())?.nodesFor('core')[0], HIVE_BLOG);

      cookie = `v=1&s.core=${encodeURIComponent(SYNCAD)}`;
      const view = await getApiSetView();
      assert.equal(view?.nodesFor('core')[0], SYNCAD);
      view?.report('core', SYNCAD, { ok: false, error: 'transport' });
      assert.equal(shared.rankings('core').find(({ node }) => node === SYNCAD)?.errorRate, 0.5);
      assert.equal(shared.selection('core'), 'auto');
    } finally {
      shared.stop();
      provideApiSetView(undefined);
    }
  });

  it('migrates a node picked before API sets existed to the sets it served', async () => {
    const config = resolveApiSetsConfig(MAINNET_ENV);
    const state = serializeApiSetChoices(
      { core: SYNCAD, bridge: SYNCAD, lite: SYNCAD, hivesense: undefined },
      config.nodes
    );
    assert.ok(state);
    const { engine: shared } = await probedEngine();
    const engine = ApiSetEngine.forRequest(shared, state);
    assert.equal(engine.selection('core'), SYNCAD);
    assert.equal(engine.selection('bridge'), SYNCAD);
    assert.equal(engine.selection('lite'), SYNCAD);
    assert.equal(engine.selection('hivesense'), 'auto');
  });

  it('drops a migrated pick of a node outside the catalog', () => {
    const config = resolveApiSetsConfig(MAINNET_ENV);
    assert.equal(serializeApiSetChoices({ core: 'http://localhost:8299' }, config.nodes), undefined);
  });
});

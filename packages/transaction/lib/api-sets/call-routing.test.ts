import { afterEach, describe, it } from 'mocha';
import { expect } from 'chai';
import { HEDGE_DELAY_MS, wrapChainWithServerFailover } from '../server-failover';
import { NodeHealth } from '../node-health';
import { JsonRpcApiError } from '../read-client';
import { ReadTransportError } from '../read-transport';
import { createApiSetRouting, type IBrowserEndpoints } from './call-routing';
import { createStaticView, provideApiSetView, type IApiSetsBootstrap } from './router';

/** The browser's calls routed by API set, as `chain.ts` wires them, against the failover wrapper. */

type Answer = 'ok' | 'transport' | 'api-not-found';

const CONFIGURED = 'https://api.hive.blog';
const LITE_NODE = 'https://api.syncad.com';
const LEGACY_PICK = 'https://api.openhive.network';
const CHOSEN = 'https://anyx.io';

interface IFakeChain {
  endpointUrl: string;
  api: {
    database_api: { get_dynamic_global_properties: (params: unknown) => Promise<unknown> };
    bridge: { get_post: (params: unknown) => Promise<unknown> };
    lite: { get_post: (params: unknown) => Promise<unknown> };
    'search-api': { find_text: (params: unknown) => Promise<unknown> };
  };
}

/** `answers[node][namespace]`; a node answers `ok` where nothing else is given. */
type TNamespace = 'database_api' | 'bridge' | 'lite' | 'search-api';
type TAnswers = Record<string, Partial<Record<TNamespace, Answer>>>;

const setup = (answers: TAnswers, bootstrap: IApiSetsBootstrap, apiEndpoint = CONFIGURED) => {
  const endpoints: IBrowserEndpoints = { apiEndpoint, restApiEndpoint: apiEndpoint };
  const switches: string[] = [];
  const announced: string[] = [];
  const switchApiNode = (node: string) => {
    switches.push(node);
    endpoints.apiEndpoint = node;
  };
  const routing = createApiSetRouting({
    endpoints: () => endpoints,
    configuredApiEndpoint: CONFIGURED,
    configuredRestEndpoint: CONFIGURED,
    switchApiNode,
    announceSwitch: (node, { setId, selected }) => announced.push(`${setId} ${selected} -> ${node}`)
  });
  provideApiSetView(() => createStaticView(bootstrap));

  const makeChain = (node: string): IFakeChain => {
    const answer = (namespace: TNamespace, method: string) => async () => {
      const outcome = answers[node]?.[namespace] ?? 'ok';
      if (outcome === 'ok') return { node };
      if (outcome === 'api-not-found') {
        throw new JsonRpcApiError(`${namespace}.${method}`, {
          error: { code: -32603, message: 'Unable to map request to endpoint.' }
        });
      }
      throw new ReadTransportError(`fetch failed: ${node}`, {
        method: 'POST',
        endpoint: node,
        url: '',
        timeout: 1,
        responseType: 'json'
      });
    };
    return {
      endpointUrl: node,
      api: {
        database_api: {
          get_dynamic_global_properties: answer('database_api', 'get_dynamic_global_properties')
        },
        bridge: { get_post: answer('bridge', 'get_post') },
        lite: { get_post: answer('lite', 'get_post') },
        'search-api': { find_text: answer('search-api', 'find_text') }
      }
    };
  };

  const chain = wrapChainWithServerFailover(makeChain(endpoints.apiEndpoint), {
    fallbackNodes: [LITE_NODE],
    routeFor: routing.routeCall,
    health: new NodeHealth(),
    isTransportError: (error) => error instanceof ReadTransportError,
    onFailover: switchApiNode,
    createNodeChain: (node) => makeChain(node),
    now: () => 0,
    // Retries run at once; a hedge never starts, so a node is asked only after the previous one failed.
    sleep: (ms) => (ms === HEDGE_DELAY_MS ? new Promise<void>(() => undefined) : Promise.resolve())
  });
  return { chain, routing, switches, announced, endpoints };
};

const ROUTES: IApiSetsBootstrap = {
  routes: { core: [CONFIGURED, LITE_NODE], bridge: [CONFIGURED, LITE_NODE], lite: [CONFIGURED, LITE_NODE] },
  selections: {}
};

describe('routing the browser calls by API set', () => {
  afterEach(() => provideApiSetView(undefined));

  it("never switches the browser's JSON-RPC node after a lite read left it", async () => {
    const { chain, routing, switches } = setup({ [CONFIGURED]: { lite: 'api-not-found' } }, ROUTES);
    expect(await chain.api.lite.get_post({})).to.deep.equal({ node: LITE_NODE });
    expect(switches).to.deep.equal([]);
    expect((await routing.nodesOf('core', [CONFIGURED]))[0]).to.equal(CONFIGURED);
    expect((await routing.nodesOf('bridge', [CONFIGURED]))[0]).to.equal(CONFIGURED);
  });

  it('never switches it after a lite or bridge node failed on transport either', async () => {
    const { chain, switches } = setup({ [CONFIGURED]: { lite: 'transport', bridge: 'transport' } }, ROUTES);
    expect(await chain.api.lite.get_post({})).to.deep.equal({ node: LITE_NODE });
    expect(await chain.api.bridge.get_post({})).to.deep.equal({ node: LITE_NODE });
    expect(switches).to.deep.equal([]);
  });

  it('switches it when a core call failed on it on transport and another node served it', async () => {
    const { chain, routing, switches } = setup({ [CONFIGURED]: { database_api: 'transport' } }, ROUTES);
    expect(await chain.api.database_api.get_dynamic_global_properties({})).to.deep.equal({ node: LITE_NODE });
    expect(switches).to.deep.equal([LITE_NODE]);
    expect((await routing.nodesOf('core', [CONFIGURED]))[0]).to.equal(LITE_NODE);
    expect((await routing.nodesOf('bridge', [CONFIGURED]))[0]).to.equal(LITE_NODE);
  });

  it('never switches it after a search-api call failed on it on transport and another node served it', async () => {
    const { chain, routing, switches, endpoints } = setup(
      { [CONFIGURED]: { 'search-api': 'transport' } },
      ROUTES
    );
    expect(await chain.api['search-api'].find_text({})).to.deep.equal({ node: LITE_NODE });
    expect(switches).to.deep.equal([]);
    expect(endpoints.apiEndpoint).to.equal(CONFIGURED);
    expect((await routing.nodesOf('core', [CONFIGURED]))[0]).to.equal(CONFIGURED);
  });

  it('puts a node picked before API sets existed first for core and bridge, never for lite', async () => {
    const { routing } = setup({}, { routes: { lite: [LITE_NODE] }, selections: {} }, LEGACY_PICK);
    expect(await routing.nodesOf('core', [CONFIGURED])).to.deep.equal([LEGACY_PICK, CONFIGURED]);
    expect(await routing.nodesOf('bridge', [CONFIGURED])).to.deep.equal([LEGACY_PICK, CONFIGURED]);
    expect(await routing.nodesOf('lite', [CONFIGURED])).to.deep.equal([LITE_NODE]);
  });

  it("fails a lite call over within the lite set's nodes only, never to the configured ones", async () => {
    const { chain, routing } = setup(
      { [LITE_NODE]: { lite: 'transport' } },
      { routes: { core: [CONFIGURED, LITE_NODE], lite: [LITE_NODE] }, selections: {} }
    );
    expect(await routing.nodesOf('lite', [CONFIGURED])).to.deep.equal([LITE_NODE]);
    const error = await chain.api.lite.get_post({}).catch((e: unknown) => e);
    expect(error).to.be.instanceOf(ReadTransportError);
    expect(String(error)).to.contain(LITE_NODE);
  });

  it('sends lite calls to the configured nodes while the routes know no lite node', async () => {
    const { routing } = setup({}, { routes: { core: [CONFIGURED] }, selections: {} });
    expect(await routing.nodesOf('lite', [CONFIGURED, LITE_NODE])).to.deep.equal([CONFIGURED, LITE_NODE]);
  });

  it("sends hivemind REST calls where bridge's go while the routes know no hivemind REST node", async () => {
    const { routing } = setup(
      {},
      { routes: { core: [CONFIGURED], bridge: [CHOSEN, LITE_NODE] }, selections: { bridge: CHOSEN } }
    );
    expect(await routing.nodesOf('hivemind-rest', [CONFIGURED])).to.deep.equal([CHOSEN, LITE_NODE, CONFIGURED]);
  });

  it('puts a REST node picked before API sets existed first for hivemind REST calls', async () => {
    const withoutOwnNodes = setup({}, { routes: { bridge: [LITE_NODE] }, selections: {} }, LEGACY_PICK);
    expect(await withoutOwnNodes.routing.nodesOf('hivemind-rest', [CONFIGURED])).to.deep.equal([
      LEGACY_PICK,
      LITE_NODE,
      CONFIGURED
    ]);
    const withOwnNodes = setup({}, { routes: { 'hivemind-rest': [CHOSEN] }, selections: {} }, LEGACY_PICK);
    expect(await withOwnNodes.routing.nodesOf('hivemind-rest', [CONFIGURED])).to.deep.equal([
      LEGACY_PICK,
      CHOSEN,
      CONFIGURED
    ]);
  });

  it('sends hivemind REST calls to its own nodes, then the configured ones, once the routes know some', async () => {
    const { routing } = setup({}, { routes: { bridge: [CHOSEN], 'hivemind-rest': [LITE_NODE] }, selections: {} });
    expect(await routing.nodesOf('hivemind-rest', [CONFIGURED])).to.deep.equal([LITE_NODE, CONFIGURED]);
  });

  it("puts the user's choice for a set before this session's automatic switch", async () => {
    const { chain, routing, switches, announced } = setup(
      { [CHOSEN]: { database_api: 'transport' } },
      { routes: { core: [CHOSEN, CONFIGURED] }, selections: { core: CHOSEN } },
      LITE_NODE
    );
    expect(await routing.nodesOf('core', [LITE_NODE])).to.deep.equal([CHOSEN, CONFIGURED, LITE_NODE]);
    expect(await routing.nodesOf('bridge', [LITE_NODE])).to.deep.equal([LITE_NODE]);

    expect(await chain.api.database_api.get_dynamic_global_properties({})).to.deep.equal({
      node: CONFIGURED
    });
    expect(switches).to.deep.equal([]);
    expect(announced).to.deep.equal([`core ${CHOSEN} -> ${CONFIGURED}`]);
  });

  it('pins nothing and switches nothing on the server', async () => {
    provideApiSetView(() => createStaticView(ROUTES));
    const routing = createApiSetRouting();
    const route = await routing.routeCall(
      'api',
      ['database_api', 'get_dynamic_global_properties'],
      [CONFIGURED]
    );
    expect(route?.nodes).to.deep.equal([CONFIGURED, LITE_NODE]);
    expect(route?.onFallback).to.equal(undefined);
    const searchRoute = await routing.routeCall('api', ['search-api', 'find_text'], [CONFIGURED]);
    expect(searchRoute?.nodes).to.deep.equal([CONFIGURED]);
    expect(searchRoute?.onFallback).to.equal(undefined);
  });
});

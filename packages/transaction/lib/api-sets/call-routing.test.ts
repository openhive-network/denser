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
  };
}

/** `answers[node][namespace]`; a node answers `ok` where nothing else is given. */
type TAnswers = Record<string, Partial<Record<'database_api' | 'bridge' | 'lite', Answer>>>;

const setup = (answers: TAnswers, bootstrap: IApiSetsBootstrap, apiEndpoint = CONFIGURED) => {
  const endpoints: IBrowserEndpoints = { apiEndpoint, restApiEndpoint: apiEndpoint };
  const switches: string[] = [];
  const announced: string[] = [];
  const routing = createApiSetRouting({
    endpoints: () => endpoints,
    configuredApiEndpoint: CONFIGURED,
    configuredRestEndpoint: CONFIGURED,
    switchApiNode: (node) => {
      switches.push(node);
      endpoints.apiEndpoint = node;
    },
    announceSwitch: (node, { setId, selected }) => announced.push(`${setId} ${selected} -> ${node}`)
  });
  provideApiSetView(() => createStaticView(bootstrap));

  const makeChain = (node: string): IFakeChain => {
    const answer = (namespace: 'database_api' | 'bridge' | 'lite', method: string) => async () => {
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
        lite: { get_post: answer('lite', 'get_post') }
      }
    };
  };

  const chain = wrapChainWithServerFailover(makeChain(endpoints.apiEndpoint), {
    fallbackNodes: [],
    routeFor: routing.routeCall,
    health: new NodeHealth(),
    isTransportError: (error) => error instanceof ReadTransportError,
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

  it('puts a node picked before API sets existed first for core and bridge, never for lite', async () => {
    const { routing } = setup({}, { routes: { lite: [LITE_NODE] }, selections: {} }, LEGACY_PICK);
    expect(await routing.nodesOf('core', [CONFIGURED])).to.deep.equal([LEGACY_PICK, CONFIGURED]);
    expect(await routing.nodesOf('bridge', [CONFIGURED])).to.deep.equal([LEGACY_PICK, CONFIGURED]);
    expect(await routing.nodesOf('lite', [CONFIGURED])).to.deep.equal([LITE_NODE, CONFIGURED]);
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
    expect(await routing.routeCall('api', ['search-api', 'find_text'], [CONFIGURED])).to.equal(undefined);
  });
});

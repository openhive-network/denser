import { describe, it } from 'mocha';
import { expect } from 'chai';
import { HEDGE_DELAY_MS, wrapChainWithServerFailover, type TFailoverOutcome } from './server-failover';
import { NodeHealth } from './node-health';
import { JsonRpcApiError } from './read-client';
import { ReadTransportError } from './read-transport';

/** Calls routed by their API family (`routeFor`), as `chain.ts` routes them through the API sets. */

type Answer = 'ok' | 'transport' | 'api-not-found';

interface IFakeChain {
  endpointUrl: string;
  api: {
    lite: { get_post: (params: unknown) => Promise<unknown> };
    bridge: { get_post: (params: unknown) => Promise<unknown> };
    network_broadcast_api: { broadcast_transaction: (params: unknown) => Promise<unknown> };
  };
}

const CONFIGURED = 'https://configured';
const FALLBACK = 'https://fallback';
const LITE_A = 'https://lite-a';
const LITE_B = 'https://lite-b';

const setup = (answers: Record<string, Answer>, routes: Record<string, string[]>) => {
  const health = new NodeHealth();
  const calls: string[] = [];
  const reports: string[] = [];
  const fallbacks: string[] = [];
  const failovers: string[] = [];
  const configuredSeen: string[][] = [];

  const makeChain = (node: string): IFakeChain => {
    const answer = (method: string) => async () => {
      calls.push(`${node} ${method}`);
      const outcome = answers[node] ?? 'transport';
      if (outcome === 'ok') return { node };
      if (outcome === 'api-not-found') {
        throw new JsonRpcApiError(method, { error: { code: -32601, message: 'Api not found lite' } });
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
        lite: { get_post: answer('lite.get_post') },
        bridge: { get_post: answer('bridge.get_post') },
        network_broadcast_api: { broadcast_transaction: answer('broadcast_transaction') }
      }
    };
  };

  const chain = wrapChainWithServerFailover(makeChain(CONFIGURED), {
    fallbackNodes: [FALLBACK],
    health,
    createNodeChain: (node) => makeChain(node),
    isTransportError: (error) => error instanceof ReadTransportError,
    onFailover: (node) => failovers.push(node),
    routeFor: async (_root, path, configured) => {
      configuredSeen.push([...configured]);
      const nodes = routes[path[0]];
      if (!nodes) return undefined;
      return {
        nodes,
        report: (node: string, outcome: TFailoverOutcome) =>
          reports.push(`${node} ${'error' in outcome ? outcome.error : 'ok'}`),
        onFallback: (node: string) => fallbacks.push(node)
      };
    },
    now: () => 0,
    // Retries run at once; a hedge never starts, so a node is asked only after the previous one failed.
    sleep: (ms) => (ms === HEDGE_DELAY_MS ? new Promise<void>(() => undefined) : Promise.resolve())
  });
  return { chain, calls, reports, fallbacks, failovers, configuredSeen };
};

describe('wrapChainWithServerFailover: calls routed by API family', () => {
  it("sends a routed call to its family's node, not to the configured one", async () => {
    const { chain, calls, reports, configuredSeen } = setup({ [LITE_A]: 'ok' }, { lite: [LITE_A] });

    expect(await chain.api.lite.get_post({})).to.deep.equal({ node: LITE_A });
    expect(calls).to.deep.equal([`${LITE_A} lite.get_post`]);
    expect(reports).to.deep.equal([`${LITE_A} ok`]);
    expect(configuredSeen).to.deep.equal([[CONFIGURED, FALLBACK]]);
  });

  it('reports each node it asked: a missing API and a transport failure apart', async () => {
    const { chain, calls, reports, fallbacks } = setup(
      { [LITE_A]: 'api-not-found', [CONFIGURED]: 'transport', [LITE_B]: 'ok' },
      { lite: [LITE_A, CONFIGURED, LITE_B] }
    );

    expect(await chain.api.lite.get_post({})).to.deep.equal({ node: LITE_B });
    // The first node is asked twice, as a primary is; a node after it gets one attempt.
    expect(calls).to.deep.equal([
      `${LITE_A} lite.get_post`,
      `${LITE_A} lite.get_post`,
      `${CONFIGURED} lite.get_post`,
      `${LITE_B} lite.get_post`
    ]);
    expect(reports).to.deep.equal([`${LITE_A} apiNotFound`, `${CONFIGURED} transport`, `${LITE_B} ok`]);
    expect(fallbacks).to.deep.equal([LITE_B]);
  });

  it('retries the routed first node once, as it does the configured primary', async () => {
    const { chain, calls, reports } = setup(
      { [LITE_A]: 'transport', [LITE_B]: 'ok' },
      { bridge: [LITE_A, LITE_B] }
    );

    expect(await chain.api.bridge.get_post({})).to.deep.equal({ node: LITE_B });
    expect(calls).to.deep.equal([
      `${LITE_A} bridge.get_post`,
      `${LITE_A} bridge.get_post`,
      `${LITE_B} bridge.get_post`
    ]);
    expect(reports).to.deep.equal([`${LITE_A} transport`, `${LITE_B} ok`]);
  });

  it('keeps the configured nodes and onFailover for a call no route covers', async () => {
    const { chain, calls, failovers, fallbacks } = setup(
      { [CONFIGURED]: 'transport', [FALLBACK]: 'ok' },
      { lite: [LITE_A] }
    );

    expect(await chain.api.bridge.get_post({})).to.deep.equal({ node: FALLBACK });
    expect(calls).to.deep.equal([
      `${CONFIGURED} bridge.get_post`,
      `${CONFIGURED} bridge.get_post`,
      `${FALLBACK} bridge.get_post`
    ]);
    expect(failovers).to.deep.equal([FALLBACK]);
    expect(fallbacks).to.deep.equal([]);
  });

  it("sends a broadcast once, to its family's first node, even when it fails", async () => {
    const { chain, calls, reports } = setup(
      { [LITE_A]: 'transport' },
      { network_broadcast_api: [LITE_A, LITE_B] }
    );

    let failure: unknown;
    await chain.api.network_broadcast_api.broadcast_transaction({}).catch((error: unknown) => {
      failure = error;
    });
    expect(failure).to.be.instanceOf(ReadTransportError);
    expect(calls).to.deep.equal([`${LITE_A} broadcast_transaction`]);
    expect(reports).to.deep.equal([]);
  });
});

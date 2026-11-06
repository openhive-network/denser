import { describe, it } from 'mocha';
import { expect } from 'chai';
import { HEDGE_DELAY_MS, jsonRpcHealthKey, wrapChainWithServerFailover } from './server-failover';
import { NodeHealth } from './node-health';
import { Connectivity, UNREACHABLE_RECHECK_MS } from './connectivity';
import type { IReadRequest } from './read-client';
import { ReadTransportError } from './read-transport';

/** While the network is down every node fails alike: a call asks one node, not all of them. */

interface IFakeChain {
  endpointUrl: string;
  api: { database_api: { get_dynamic_global_properties: (params: unknown) => Promise<unknown> } };
}

const NODES = ['https://primary', 'https://second', 'https://third'];
const [PRIMARY] = NODES;

const REQUEST: IReadRequest = { method: 'POST', endpoint: PRIMARY, url: '', timeout: 0, responseType: 'json' };

const networkFailure = () =>
  new ReadTransportError('Unknown request error caught (possible network or CORS error)', REQUEST);

type TNodeState = 'ok' | 'offline' | 'http-503';

const setup = (state: Record<string, TNodeState>) => {
  let time = 0;
  const now = () => time;
  const health = new NodeHealth({ now });
  const connectivity = new Connectivity({ now });
  const calls: string[] = [];
  const makeChain = (node: string): IFakeChain => ({
    endpointUrl: node,
    api: {
      database_api: {
        get_dynamic_global_properties: async () => {
          calls.push(node);
          if (state[node] === 'ok') return { node };
          if (state[node] === 'http-503') throw new ReadTransportError('#503', REQUEST, 503);
          throw networkFailure();
        }
      }
    }
  });
  const chain = wrapChainWithServerFailover(makeChain(PRIMARY), {
    fallbackNodes: NODES.slice(1),
    health,
    connectivity,
    createNodeChain: (node) => makeChain(node),
    isTransportError: (error) => error instanceof ReadTransportError,
    now,
    // Retries run at once; a hedge never starts, so a node is asked only after the previous one failed.
    sleep: (ms) => (ms === HEDGE_DELAY_MS ? new Promise<void>(() => undefined) : Promise.resolve())
  });
  const read = () => chain.api.database_api.get_dynamic_global_properties({});
  const advance = (ms: number) => {
    time += ms;
  };
  return { read, calls, health, connectivity, advance };
};

const offlineEverywhere = (): Record<string, TNodeState> => Object.fromEntries(NODES.map((node) => [node, 'offline']));

describe('wrapChainWithServerFailover: connectivity', () => {
  it('finds the network down when no node answers a call at all', async () => {
    const { read, calls, connectivity } = setup(offlineEverywhere());

    await read().catch(() => undefined);

    expect(new Set(calls)).to.deep.equal(new Set(NODES));
    expect(connectivity.isConnected()).to.equal(false);
  });

  it('then asks only the first node, once, without marking it down', async () => {
    const { read, calls, connectivity, health } = setup(offlineEverywhere());
    await read().catch(() => undefined);
    calls.length = 0;
    NODES.forEach((node) => health.markUp(jsonRpcHealthKey(node, 'database_api')));

    const error = await read().catch((e: unknown) => e);

    expect(error).to.be.instanceOf(ReadTransportError);
    expect(calls).to.deep.equal([PRIMARY]);
    expect(health.isDown(jsonRpcHealthKey(PRIMARY, 'database_api'))).to.equal(false);
    expect(connectivity.isConnected()).to.equal(false);
  });

  it('fails over across every node again once UNREACHABLE_RECHECK_MS has passed', async () => {
    const { read, calls, advance } = setup(offlineEverywhere());
    await read().catch(() => undefined);
    advance(UNREACHABLE_RECHECK_MS);
    calls.length = 0;

    await read().catch(() => undefined);

    expect(new Set(calls)).to.deep.equal(new Set(NODES));
  });

  it('is connected again as soon as a node answers', async () => {
    const state = offlineEverywhere();
    const { read, connectivity } = setup(state);
    await read().catch(() => undefined);
    state[PRIMARY] = 'ok';

    expect(await read()).to.deep.equal({ node: PRIMARY });
    expect(connectivity.isConnected()).to.equal(true);
  });

  it('keeps the network up when a node answered, even with an HTTP error', async () => {
    const state = offlineEverywhere();
    state[NODES[1]] = 'http-503';
    const { read, connectivity } = setup(state);

    await read().catch(() => undefined);

    expect(connectivity.isConnected()).to.equal(true);
  });

  it('asks only the first node while the browser is offline', async () => {
    const { read, calls, connectivity } = setup(offlineEverywhere());
    const target = new EventTarget();
    connectivity.followBrowser(target);
    target.dispatchEvent(new Event('offline'));

    await read().catch(() => undefined);

    expect(calls).to.deep.equal([PRIMARY]);
  });
});

describe('Connectivity', () => {
  it('follows the browser offline and back online, telling its listeners each time', () => {
    const connectivity = new Connectivity();
    const target = new EventTarget();
    const changes: boolean[] = [];
    connectivity.followBrowser(target);
    connectivity.onChange((connected) => changes.push(connected));

    target.dispatchEvent(new Event('offline'));
    expect(connectivity.isBrowserOffline()).to.equal(true);
    expect(connectivity.admitsFailover()).to.equal(false);
    target.dispatchEvent(new Event('online'));

    expect(changes).to.deep.equal([false, true]);
    expect(connectivity.isConnected()).to.equal(true);
  });

  it('clears nodes found unreachable on the online event', () => {
    const connectivity = new Connectivity();
    const target = new EventTarget();
    connectivity.followBrowser(target);
    connectivity.reportUnanswered();

    target.dispatchEvent(new Event('online'));

    expect(connectivity.isConnected()).to.equal(true);
    expect(connectivity.admitsFailover()).to.equal(true);
  });

  it('counts only a request that got no answer as unanswered', () => {
    const connectivity = new Connectivity();

    expect(connectivity.isUnanswered(networkFailure())).to.equal(true);
    expect(connectivity.isUnanswered(new ReadTransportError('#503', REQUEST, 503))).to.equal(false);
    expect(connectivity.isUnanswered(new Error('Post does not exist'))).to.equal(false);
  });
});

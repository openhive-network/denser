import { describe, it } from 'mocha';
import { expect } from 'chai';
import { FAILOVER_ATTEMPT_TIMEOUT_MS, HEDGE_DELAY_MS, jsonRpcHealthKey, wrapChainWithServerFailover } from './server-failover';
import { NodeHealth } from './node-health';
import { Connectivity, SILENT_NODE_WINDOW_MS, UNREACHABLE_RECHECK_MS } from './connectivity';
import type { IReadRequest } from './read-client';
import { ReadTransportError } from './read-transport';

/** While the network is down every node fails alike: a call asks one node, not all of them. */

interface IFakeChain {
  endpointUrl: string;
  withTimeout: (timeoutMs: number) => IFakeChain;
  api: {
    database_api: { get_dynamic_global_properties: (params: unknown) => Promise<unknown> };
    lite: { get_account_history: (params: unknown) => Promise<unknown> };
  };
}

const NODES = ['https://primary', 'https://second', 'https://third'];
const [PRIMARY] = NODES;

const REQUEST: IReadRequest = { method: 'POST', endpoint: PRIMARY, url: '', timeout: 0, responseType: 'json' };

const networkFailure = () =>
  new ReadTransportError('Unknown request error caught (possible network or CORS error)', REQUEST);

// `hanging`: the request gets no answer until its timeout, with no `offline` event.
type TNodeState = 'ok' | 'offline' | 'http-503' | 'hanging';

// The nodes `lite.*` calls are routed to, a list of their own.
const LITE_NODES = NODES.slice(0, 2);

const setup = (state: Record<string, TNodeState>, liteState: Record<string, TNodeState> = state) => {
  let time = 0;
  const now = () => time;
  const health = new NodeHealth({ now });
  const connectivity = new Connectivity({ now });
  const calls: string[] = [];
  const respond = async (node: string, nodeState: TNodeState, timeoutMs: number) => {
    calls.push(node);
    if (nodeState === 'ok') return { node };
    if (nodeState === 'http-503') throw new ReadTransportError('#503', REQUEST, 503);
    if (nodeState === 'hanging') {
      time += timeoutMs;
      throw new ReadTransportError('Request timeout', REQUEST);
    }
    throw networkFailure();
  };
  const makeChain = (node: string, timeoutMs = FAILOVER_ATTEMPT_TIMEOUT_MS): IFakeChain => ({
    endpointUrl: node,
    withTimeout: (ms) => makeChain(node, ms),
    api: {
      database_api: { get_dynamic_global_properties: () => respond(node, state[node], timeoutMs) },
      lite: { get_account_history: () => respond(node, liteState[node], timeoutMs) }
    }
  });
  const chain = wrapChainWithServerFailover(makeChain(PRIMARY), {
    fallbackNodes: NODES.slice(1),
    health,
    connectivity,
    createNodeChain: (node, timeoutMs) => makeChain(node, timeoutMs),
    isTransportError: (error) => error instanceof ReadTransportError,
    routeFor: async (_root, path) => (path[0] === 'lite' ? { nodes: LITE_NODES, family: 'lite' } : undefined),
    now,
    // Retries run at once; a hedge never starts, so a node is asked only after the previous one failed.
    sleep: (ms) => (ms === HEDGE_DELAY_MS ? new Promise<void>(() => undefined) : Promise.resolve())
  });
  const read = () => chain.api.database_api.get_dynamic_global_properties({});
  // A heavy read: each node asked once, two nodes at most.
  const heavyRead = (timeoutMs = 30_000) =>
    chain.withTimeout(timeoutMs).api.database_api.get_dynamic_global_properties({});
  const liteRead = () => chain.api.lite.get_account_history({});
  const advance = (ms: number) => {
    time += ms;
  };
  return { read, heavyRead, liteRead, calls, health, connectivity, advance, now };
};

const offlineEverywhere = (): Record<string, TNodeState> => Object.fromEntries(NODES.map((node) => [node, 'offline']));
const hangingEverywhere = (): Record<string, TNodeState> => Object.fromEntries(NODES.map((node) => [node, 'hanging']));

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

  it('keeps the network up when a call limited to fewer nodes got no answer', async () => {
    const state = offlineEverywhere();
    const { read, heavyRead, calls, connectivity } = setup(state);

    await heavyRead().catch(() => undefined);

    expect(calls).to.deep.equal(NODES.slice(0, 2));
    expect(connectivity.isConnected()).to.equal(true);
    state[NODES[2]] = 'ok';
    expect(await read()).to.deep.equal({ node: NODES[2] });
  });

  it('asks the first node not down, not a pinned dead one, while the network is down', async () => {
    const state = offlineEverywhere();
    state[NODES[1]] = 'ok';
    const { read, calls, connectivity, health } = setup(state);
    health.markDown(jsonRpcHealthKey(PRIMARY, 'database_api'));
    connectivity.reportUnanswered();

    expect(await read()).to.deep.equal({ node: NODES[1] });
    expect(calls).to.deep.equal([NODES[1]]);
    expect(connectivity.isConnected()).to.equal(true);
  });

  it('is connected again when a node answers with an HTTP error after an outage', async () => {
    const state = offlineEverywhere();
    const { read, connectivity } = setup(state);
    await read().catch(() => undefined);
    NODES.forEach((node) => {
      state[node] = 'http-503';
    });

    await read().catch(() => undefined);

    expect(connectivity.isConnected()).to.equal(true);
  });

  it('is back online once a node answers, even without the online event', async () => {
    const state = offlineEverywhere();
    const { read, connectivity } = setup(state);
    const target = new EventTarget();
    connectivity.followBrowser(target);
    target.dispatchEvent(new Event('offline'));
    state[PRIMARY] = 'ok';

    expect(await read()).to.deep.equal({ node: PRIMARY });
    expect(connectivity.isBrowserOffline()).to.equal(false);
    expect(connectivity.isConnected()).to.equal(true);
  });

  it('finds the network down when every node stays silent across calls that each ask fewer', async () => {
    const { read, calls, connectivity } = setup(hangingEverywhere());

    await read().catch(() => undefined);
    expect(calls).to.deep.equal([PRIMARY]);
    expect(connectivity.isConnected()).to.equal(true);
    for (let i = 1; i < NODES.length; i += 1) await read().catch(() => undefined);

    expect(calls).to.deep.equal(NODES);
    expect(connectivity.isConnected()).to.equal(false);
    calls.length = 0;
    await read().catch(() => undefined);
    await read().catch(() => undefined);
    expect(calls).to.have.length(2);
  });

  it('is connected again when a node answers after the nodes stayed silent', async () => {
    const state = hangingEverywhere();
    const { read, connectivity } = setup(state);
    for (let i = 0; i < NODES.length; i += 1) await read().catch(() => undefined);
    NODES.forEach((node) => {
      state[node] = 'ok';
    });

    await read();

    expect(connectivity.isConnected()).to.equal(true);
  });

  it('keeps the network up when two nodes stall while another answers', async () => {
    const state = hangingEverywhere();
    state[NODES[2]] = 'ok';
    const { read, calls, connectivity, advance } = setup(state);

    for (let i = 0; i < 6; i += 1) {
      await read().catch(() => undefined);
      expect(connectivity.isConnected()).to.equal(true);
      advance(10_000);
    }

    expect(calls).to.include.members(NODES);
  });

  it('keeps the network up when a heavy read stalls on every one of three nodes', async () => {
    const { heavyRead, calls, connectivity } = setup(hangingEverywhere());

    for (let i = 0; i < 4; i += 1) {
      await heavyRead(15_000).catch(() => undefined);
      expect(connectivity.isConnected()).to.equal(true);
    }

    expect(calls).to.include.members(NODES);
  });

  it('still finds the network down through plain reads after heavy reads stalled', async () => {
    const { read, heavyRead, connectivity, now } = setup(hangingEverywhere());
    await heavyRead(15_000).catch(() => undefined);
    const readsStartedAt = now();

    // The heavy read left two nodes down, so the plain reads reach the third one only after its cooldown.
    while (connectivity.isConnected() && now() - readsStartedAt <= SILENT_NODE_WINDOW_MS) {
      await read().catch(() => undefined);
    }

    expect(connectivity.isConnected()).to.equal(false);
  });

  it('keeps the network up when the nodes of a lite route stall on lite calls alone', async () => {
    const state = Object.fromEntries(NODES.map((node): [string, TNodeState] => [node, 'ok']));
    const liteState = hangingEverywhere();
    const { liteRead, calls, connectivity } = setup(state, liteState);

    for (let i = 0; i < 4; i += 1) {
      await liteRead().catch(() => undefined);
      expect(connectivity.isConnected()).to.equal(true);
    }

    expect(new Set(calls)).to.deep.equal(new Set(LITE_NODES));
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

  it('finds the nodes unreachable once each was silent within SILENT_NODE_WINDOW_MS', () => {
    let time = 0;
    const connectivity = new Connectivity({ now: () => time });

    connectivity.reportSilent(NODES[0], NODES);
    time += SILENT_NODE_WINDOW_MS + 1;
    connectivity.reportSilent(NODES[1], NODES);
    connectivity.reportSilent(NODES[2], NODES);
    expect(connectivity.isConnected()).to.equal(true);

    connectivity.reportSilent(NODES[0], NODES);
    expect(connectivity.isConnected()).to.equal(false);
  });

  it('forgets silent nodes once any node answers', () => {
    const connectivity = new Connectivity();

    connectivity.reportSilent(NODES[0], NODES);
    connectivity.reportSilent(NODES[1], NODES);
    connectivity.reportAnswered();
    connectivity.reportSilent(NODES[2], NODES);

    expect(connectivity.isConnected()).to.equal(true);
  });

  it('never finds a single node unreachable by its silence alone', () => {
    const connectivity = new Connectivity();

    connectivity.reportSilent(PRIMARY, [PRIMARY]);

    expect(connectivity.isConnected()).to.equal(true);
  });

  it('counts only a request that got no answer as unanswered', () => {
    const connectivity = new Connectivity();

    expect(connectivity.isUnanswered(networkFailure())).to.equal(true);
    expect(connectivity.isUnanswered(new ReadTransportError('#503', REQUEST, 503))).to.equal(false);
    expect(connectivity.isUnanswered(new Error('Post does not exist'))).to.equal(false);
  });
});

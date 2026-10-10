import { describe, it } from 'mocha';
import { expect } from 'chai';
import { WaxRequestError } from '@hiveio/wax';
import {
  FAILOVER_ATTEMPT_TIMEOUT_MS,
  FAILOVER_BUDGET_MS,
  HEDGE_DELAY_MS,
  parseFallbackNodes,
  wrapChainWithServerFailover,
  type IServerFailoverOptions
} from './server-failover';
import { NODE_COOLDOWN_MS, NodeHealth } from './node-health';
import { getLogger } from '@ui/lib/logging';

type Outcome = 'ok' | 'transport' | 'missing';

interface IFakeChain {
  api: {
    bridge: { get_ranked_posts: (params: unknown) => Promise<unknown> };
    network_broadcast_api: { broadcast_transaction: (params: unknown) => Promise<unknown> };
  };
  endpointUrl: string;
  chainId: string;
}

/** Request timeout of the configured primary chain (wax's default `apiTimeout`). */
const PRIMARY_TIMEOUT_MS = 5_000;

/**
 * Virtual time: `sleep` registers a timer, and `run` / `advance` fire due timers in order, letting
 * every promise reaction run before the next one.
 */
const createFakeClock = () => {
  let time = 0;
  const timers: Array<{ at: number; resolve: () => void }> = [];
  const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

  const fireTimersUntil = async (done: () => boolean, until: number) => {
    for (;;) {
      await flush();
      if (done()) return;
      timers.sort((a, b) => a.at - b.at);
      const next = timers[0];
      if (!next || next.at > until) return;
      timers.shift();
      time = next.at;
      next.resolve();
    }
  };

  return {
    now: () => time,
    sleep: (ms: number) => new Promise<void>((resolve) => timers.push({ at: time + ms, resolve })),
    run: async <T>(promise: Promise<T>): Promise<T> => {
      let settled = false;
      const tracked = promise.finally(() => {
        settled = true;
      });
      await fireTimersUntil(() => settled, Infinity);
      if (!settled) throw new Error('call never settled');
      return tracked;
    },
    advance: async (ms: number) => {
      const until = time + ms;
      await fireTimersUntil(() => false, until);
      time = until;
    }
  };
};

/**
 * A fake wax chain per node. Each node answers from its own queue of outcomes (the last one
 * repeats) after `latencyMs` of fake time, or the node's own `nodeLatencyMs` (`Infinity`: it never
 * answers); a call slower than the chain's request timeout fails with a transport error then.
 */
interface ISetupOptions {
  latencyMs?: number;
  nodeLatencyMs?: Record<string, number>;
  primary?: string;
  hooks?: Pick<IServerFailoverOptions<IFakeChain>, 'isTransportError' | 'onFailover'>;
}

const setup = (
  outcomes: Record<string, Outcome[]>,
  { latencyMs = 100, nodeLatencyMs = {}, primary = 'https://primary', hooks = {} }: ISetupOptions = {}
) => {
  const clock = createFakeClock();
  const health = new NodeHealth({ now: clock.now });
  const calls: string[] = [];
  const created: Array<{ node: string; timeoutMs: number }> = [];

  const answer = async (node: string, timeoutMs: number, method: string, params: unknown) => {
    calls.push(`${node} ${method}`);
    const queue = outcomes[node] ?? ['transport'];
    const outcome = queue.length > 1 ? queue.shift() : queue[0];
    const latency = nodeLatencyMs[node] ?? latencyMs;
    await clock.sleep(Math.min(latency, timeoutMs));
    if (latency > timeoutMs || outcome === 'transport') throw new WaxRequestError(`fetch failed: ${node}`);
    if (outcome === 'missing')
      throw Object.assign(new Error('Post does not exist'), { name: 'WaxChainApiError' });
    return { node, params };
  };

  const makeChain = (node: string, timeoutMs: number): IFakeChain => ({
    endpointUrl: node,
    chainId: 'beeab0de',
    api: {
      bridge: { get_ranked_posts: (params) => answer(node, timeoutMs, 'bridge.get_ranked_posts', params) },
      network_broadcast_api: {
        broadcast_transaction: (params) => answer(node, timeoutMs, 'broadcast_transaction', params)
      }
    }
  });

  const chain = wrapChainWithServerFailover(makeChain(primary, PRIMARY_TIMEOUT_MS), {
    fallbackNodes: ['https://fallback-a', primary, 'https://fallback-b'],
    createNodeChain: (node, timeoutMs) => {
      created.push({ node, timeoutMs });
      return makeChain(node, timeoutMs);
    },
    health,
    ...hooks,
    now: clock.now,
    sleep: clock.sleep
  });

  const rankedPosts = (params: unknown = {}) => clock.run(chain.api.bridge.get_ranked_posts(params));

  return { chain, rankedPosts, run: clock.run, calls, created, elapsed: clock.now, advance: clock.advance };
};

describe('wrapChainWithServerFailover', () => {
  it('passes a successful call through without any extra attempt', async () => {
    const { rankedPosts, calls, created } = setup({ 'https://primary': ['ok'] });

    const result = await rankedPosts({ sort: 'trending' });

    expect(result).to.deep.equal({ node: 'https://primary', params: { sort: 'trending' } });
    expect(calls).to.deep.equal(['https://primary bridge.get_ranked_posts']);
    expect(created).to.deep.equal([]);
  });

  it('retries the primary node once after a transient transport failure', async () => {
    const { rankedPosts, calls, created } = setup({ 'https://primary': ['transport', 'ok'] });

    const result = await rankedPosts({ sort: 'trending' });

    expect(result).to.deep.equal({ node: 'https://primary', params: { sort: 'trending' } });
    expect(calls).to.deep.equal([
      'https://primary bridge.get_ranked_posts',
      'https://primary bridge.get_ranked_posts'
    ]);
    expect(created).to.deep.equal([{ node: 'https://primary', timeoutMs: FAILOVER_ATTEMPT_TIMEOUT_MS }]);
  });

  it('fails over to the fallback nodes in order, skipping the primary in the list', async () => {
    const { rankedPosts, calls } = setup({
      'https://primary': ['transport'],
      'https://fallback-a': ['transport'],
      'https://fallback-b': ['ok']
    });

    const result = await rankedPosts({ sort: 'hot' });

    expect(result).to.deep.equal({ node: 'https://fallback-b', params: { sort: 'hot' } });
    expect(calls).to.deep.equal([
      'https://primary bridge.get_ranked_posts',
      'https://primary bridge.get_ranked_posts',
      'https://fallback-a bridge.get_ranked_posts',
      'https://fallback-b bridge.get_ranked_posts'
    ]);
  });

  it('reuses one chain per node across calls', async () => {
    const { rankedPosts, created } = setup({ 'https://primary': ['transport', 'ok', 'transport', 'ok'] });

    await rankedPosts({});
    await rankedPosts({});

    expect(created.map(({ node }) => node)).to.deep.equal(['https://primary']);
  });

  it('never retries a definitive API answer', async () => {
    const { rankedPosts, calls } = setup({ 'https://primary': ['missing'] });

    const error = await rankedPosts({}).catch((e: unknown) => e);

    expect(error).to.be.instanceOf(Error).with.property('name', 'WaxChainApiError');
    expect(calls).to.have.length(1);
  });

  it('stops on a definitive answer from a fallback node instead of trying further nodes', async () => {
    const { rankedPosts, calls } = setup({ 'https://primary': ['transport'], 'https://fallback-a': ['missing'] });

    const error = await rankedPosts({}).catch((e: unknown) => e);

    expect(error).to.have.property('name', 'WaxChainApiError');
    expect(calls).to.have.length(3);
  });

  it('never re-sends a broadcast', async () => {
    const { chain, run, calls } = setup({ 'https://primary': ['transport', 'ok'] });

    const error = await run(chain.api.network_broadcast_api.broadcast_transaction({})).catch((e: unknown) => e);

    expect(error).to.be.instanceOf(WaxRequestError);
    expect(calls).to.deep.equal(['https://primary broadcast_transaction']);
  });

  it('rethrows the last transport error once every node failed', async () => {
    const { rankedPosts, calls } = setup({});

    const error = await rankedPosts({}).catch((e: unknown) => e);

    expect(error)
      .to.be.instanceOf(WaxRequestError)
      .with.property('message', 'fetch failed: https://fallback-b');
    expect(calls).to.have.length(4);
  });

  it('does not start an attempt that could overrun the time budget', async () => {
    // Each failure takes a full attempt timeout, so only part of the node list fits the budget.
    const { rankedPosts, calls, elapsed } = setup({}, { latencyMs: FAILOVER_ATTEMPT_TIMEOUT_MS });

    await rankedPosts({}).catch(() => undefined);

    expect(elapsed()).to.be.at.most(FAILOVER_BUDGET_MS);
    expect(calls.length).to.be.lessThan(4);
  });

  describe('a dead or slow node', () => {
    const ranked = 'bridge.get_ranked_posts';

    it('serves a cold first call through the fallback when the primary never answers', async () => {
      const { rankedPosts, calls, elapsed } = setup(
        { 'https://fallback-a': ['ok'] },
        { nodeLatencyMs: { 'https://primary': Infinity } }
      );

      const first = await rankedPosts({});
      const firstMs = elapsed();
      calls.length = 0;
      const second = await rankedPosts({});

      expect(first).to.have.property('node', 'https://fallback-a');
      expect(firstMs).to.equal(HEDGE_DELAY_MS + 100);
      expect(firstMs).to.be.below(FAILOVER_BUDGET_MS);
      expect(second).to.have.property('node', 'https://fallback-a');
      expect(calls).to.deep.equal([`https://fallback-a ${ranked}`]);
    });

    it('does not mark a node down for one answer slower than the old 2 s attempt timeout', async () => {
      const { rankedPosts, calls } = setup(
        { 'https://primary': ['transport'], 'https://fallback-a': ['ok'] },
        { nodeLatencyMs: { 'https://fallback-a': 2_100 } }
      );

      const first = await rankedPosts({});
      calls.length = 0;
      const second = await rankedPosts({});

      expect(first).to.have.property('node', 'https://fallback-a');
      expect(second).to.have.property('node', 'https://fallback-a');
      expect(calls).to.deep.equal([`https://fallback-a ${ranked}`]);
    });

    it('takes a hedged-past node back once its late answer arrives', async () => {
      const { rankedPosts, calls, advance } = setup(
        { 'https://primary': ['ok'], 'https://fallback-a': ['ok'] },
        { nodeLatencyMs: { 'https://primary': HEDGE_DELAY_MS + 1_000 } }
      );

      const first = await rankedPosts({});
      await advance(1_000);
      calls.length = 0;
      await rankedPosts({});

      expect(first).to.have.property('node', 'https://fallback-a');
      expect(calls[0]).to.equal(`https://primary ${ranked}`);
    });

    it('asks the most recently healthy node first when every node is down', async () => {
      const { rankedPosts, calls } = setup({
        'https://primary': ['transport'],
        'https://fallback-a': ['transport'],
        'https://fallback-b': ['ok', 'transport', 'ok']
      });
      await rankedPosts({});
      await rankedPosts({}).catch(() => undefined);
      calls.length = 0;

      const result = await rankedPosts({});

      expect(result).to.have.property('node', 'https://fallback-b');
      expect(calls).to.deep.equal([`https://fallback-b ${ranked}`]);
    });

    it('names only the nodes it tried when the call fails', async () => {
      const logger = getLogger('app');
      const originalError = logger.error;
      const logged: unknown[][] = [];
      logger.error = (...args: unknown[]) => {
        logged.push(args);
      };
      try {
        const { rankedPosts } = setup({ 'https://fallback-a': ['ok', 'transport'] });
        await rankedPosts({});
        logged.length = 0;

        await rankedPosts({}).catch(() => undefined);
      } finally {
        logger.error = originalError;
      }

      expect(logged).to.have.length(1);
      expect(logged[0][3]).to.equal('https://fallback-a, https://fallback-b');
    });
  });

  describe('remembering failed nodes', () => {
    const ranked = 'bridge.get_ranked_posts';

    it('sends later calls straight to the fallback once the primary stalled', async () => {
      const { rankedPosts, calls, elapsed } = setup(
        { 'https://primary': ['transport'], 'https://fallback-a': ['ok'] },
        { nodeLatencyMs: { 'https://primary': FAILOVER_ATTEMPT_TIMEOUT_MS } }
      );
      await rankedPosts({});
      calls.length = 0;
      const before = elapsed();

      const results = [await rankedPosts({}), await rankedPosts({})];

      expect(results.map((result) => (result as { node: string }).node)).to.deep.equal([
        'https://fallback-a',
        'https://fallback-a'
      ]);
      expect(calls).to.deep.equal([`https://fallback-a ${ranked}`, `https://fallback-a ${ranked}`]);
      expect(elapsed() - before).to.equal(200);
    });

    it('probes the primary after the cooldown and prefers it again once it answers', async () => {
      const { rankedPosts, calls, advance } = setup({
        'https://primary': ['transport', 'transport', 'ok'],
        'https://fallback-a': ['ok']
      });
      await rankedPosts({});
      calls.length = 0;

      await advance(NODE_COOLDOWN_MS / 2);
      const duringCooldown = await rankedPosts({});
      await advance(NODE_COOLDOWN_MS / 2);
      const probed = await rankedPosts({});
      const next = await rankedPosts({});

      expect(duringCooldown).to.have.property('node', 'https://fallback-a');
      expect(probed).to.have.property('node', 'https://primary');
      expect(next).to.have.property('node', 'https://primary');
      expect(calls).to.deep.equal([
        `https://fallback-a ${ranked}`,
        `https://primary ${ranked}`,
        `https://primary ${ranked}`
      ]);
    });

    it('restarts the cooldown when the probe fails, without retrying the primary', async () => {
      const { rankedPosts, calls, advance } = setup({ 'https://fallback-a': ['ok'] });
      await rankedPosts({});
      await advance(NODE_COOLDOWN_MS);
      calls.length = 0;

      await rankedPosts({});
      await advance(NODE_COOLDOWN_MS / 2);
      await rankedPosts({});

      expect(calls).to.deep.equal([
        `https://primary ${ranked}`,
        `https://fallback-a ${ranked}`,
        `https://fallback-a ${ranked}`
      ]);
    });

    it('lets only one of concurrent calls probe a recovering node', async () => {
      const { chain, rankedPosts, run, calls, advance } = setup({ 'https://fallback-a': ['ok'] });
      await rankedPosts({});
      await advance(NODE_COOLDOWN_MS);
      calls.length = 0;

      await run(Promise.all([chain.api.bridge.get_ranked_posts({}), chain.api.bridge.get_ranked_posts({})]));

      expect(calls.filter((call) => call.startsWith('https://primary'))).to.have.length(1);
    });

    it('tries every node again, as before, when all of them are down', async () => {
      const { rankedPosts, calls } = setup({});
      await rankedPosts({}).catch(() => undefined);
      calls.length = 0;

      const error = await rankedPosts({}).catch((e: unknown) => e);

      expect(error)
        .to.be.instanceOf(WaxRequestError)
        .with.property('message', 'fetch failed: https://fallback-b');
      expect(calls).to.deep.equal([
        `https://primary ${ranked}`,
        `https://primary ${ranked}`,
        `https://fallback-a ${ranked}`,
        `https://fallback-b ${ranked}`
      ]);
    });

    it('keeps preferring the primary after a failure its retry recovered from', async () => {
      const { rankedPosts, calls } = setup({ 'https://primary': ['transport', 'ok'] });
      await rankedPosts({});
      calls.length = 0;

      await rankedPosts({});

      expect(calls).to.deep.equal([`https://primary ${ranked}`]);
    });
  });

  describe('onFailover', () => {
    it('reports the node that served a call the primary failed', async () => {
      const servedBy: string[] = [];
      const { rankedPosts } = setup(
        { 'https://primary': ['transport'], 'https://fallback-a': ['ok'] },
        { hooks: { onFailover: (node) => servedBy.push(node) } }
      );

      await rankedPosts({});

      expect(servedBy).to.deep.equal(['https://fallback-a']);
    });

    it('stays silent when the primary answered, also after a retry', async () => {
      const servedBy: string[] = [];
      const { rankedPosts } = setup(
        { 'https://primary': ['transport', 'ok'] },
        { hooks: { onFailover: (node) => servedBy.push(node) } }
      );

      await rankedPosts({});
      await rankedPosts({});

      expect(servedBy).to.deep.equal([]);
    });

    it('stays silent when every node failed', async () => {
      const servedBy: string[] = [];
      const { rankedPosts } = setup({}, { hooks: { onFailover: (node) => servedBy.push(node) } });

      await rankedPosts({}).catch(() => undefined);

      expect(servedBy).to.deep.equal([]);
    });
  });

  it('decides what fails over with the given transport-error check instead of wax\'s', async () => {
    const { rankedPosts, calls } = setup(
      { 'https://primary': ['missing'], 'https://fallback-a': ['ok'] },
      { hooks: { isTransportError: (error) => error instanceof Error && error.name === 'WaxChainApiError' } }
    );

    const result = await rankedPosts({});

    expect(result).to.deep.equal({ node: 'https://fallback-a', params: {} });
    expect(calls).to.have.length(3);
  });

  it('leaves everything other than chain.api untouched', () => {
    const { chain } = setup({});

    expect(chain.endpointUrl).to.equal('https://primary');
    expect(chain.chainId).to.equal('beeab0de');
  });
});

describe('parseFallbackNodes', () => {
  it('splits on spaces and commas, normalises to origins and drops duplicates', () => {
    expect(
      parseFallbackNodes('https://api.hive.blog/ https://api.syncad.com,https://api.hive.blog')
    ).to.deep.equal(['https://api.hive.blog', 'https://api.syncad.com']);
  });

  it('drops excluded hosts and anything that is not an http(s) URL', () => {
    expect(
      parseFallbackNodes(
        'https://api.hive.blog https://images.hive.blog not-a-url ftp://x.example http://localhost:8200',
        ['https://images.hive.blog/', undefined]
      )
    ).to.deep.equal(['https://api.hive.blog', 'http://localhost:8200']);
  });

  it('returns an empty list when nothing is configured', () => {
    expect(parseFallbackNodes(undefined)).to.deep.equal([]);
  });
});

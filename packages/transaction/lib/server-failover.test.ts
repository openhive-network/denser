import { describe, it } from 'mocha';
import { expect } from 'chai';
import { WaxRequestError } from '@hiveio/wax';
import {
  FAILOVER_ATTEMPT_TIMEOUT_MS,
  FAILOVER_BUDGET_MS,
  parseFallbackNodes,
  wrapChainWithServerFailover,
  type IServerFailoverOptions
} from './server-failover';
import { NODE_COOLDOWN_MS, NodeHealth } from './node-health';

type Outcome = 'ok' | 'transport' | 'missing';

interface IFakeChain {
  api: {
    bridge: { get_ranked_posts: (params: unknown) => Promise<unknown> };
    network_broadcast_api: { broadcast_transaction: (params: unknown) => Promise<unknown> };
  };
  endpointUrl: string;
  chainId: string;
}

/**
 * A fake wax chain per node. Each node answers from its own queue of outcomes (the last one
 * repeats) and every call takes `latencyMs` of fake time, or the node's own `nodeLatencyMs`.
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
  let clock = 0;
  const now = () => clock;
  const health = new NodeHealth({ now });
  const calls: string[] = [];
  const created: Array<{ node: string; timeoutMs: number }> = [];

  const answer = async (node: string, method: string, params: unknown) => {
    calls.push(`${node} ${method}`);
    clock += nodeLatencyMs[node] ?? latencyMs;
    const queue = outcomes[node] ?? ['transport'];
    const outcome = queue.length > 1 ? queue.shift() : queue[0];
    if (outcome === 'transport') throw new WaxRequestError(`fetch failed: ${node}`);
    if (outcome === 'missing')
      throw Object.assign(new Error('Post does not exist'), { name: 'WaxChainApiError' });
    return { node, params };
  };

  const makeChain = (node: string): IFakeChain => ({
    endpointUrl: node,
    chainId: 'beeab0de',
    api: {
      bridge: { get_ranked_posts: (params) => answer(node, 'bridge.get_ranked_posts', params) },
      network_broadcast_api: {
        broadcast_transaction: (params) => answer(node, 'broadcast_transaction', params)
      }
    }
  });

  const chain = wrapChainWithServerFailover(makeChain(primary), {
    fallbackNodes: ['https://fallback-a', primary, 'https://fallback-b'],
    createNodeChain: (node, timeoutMs) => {
      created.push({ node, timeoutMs });
      return makeChain(node);
    },
    health,
    ...hooks,
    now,
    sleep: async (ms) => {
      clock += ms;
    }
  });

  const advance = (ms: number) => {
    clock += ms;
  };

  return { chain, calls, created, elapsed: () => clock, advance };
};

describe('wrapChainWithServerFailover', () => {
  it('passes a successful call through without any extra attempt', async () => {
    const { chain, calls, created } = setup({ 'https://primary': ['ok'] });

    const result = await chain.api.bridge.get_ranked_posts({ sort: 'trending' });

    expect(result).to.deep.equal({ node: 'https://primary', params: { sort: 'trending' } });
    expect(calls).to.deep.equal(['https://primary bridge.get_ranked_posts']);
    expect(created).to.deep.equal([]);
  });

  it('retries the primary node once after a transient transport failure', async () => {
    const { chain, calls, created } = setup({ 'https://primary': ['transport', 'ok'] });

    const result = await chain.api.bridge.get_ranked_posts({ sort: 'trending' });

    expect(result).to.deep.equal({ node: 'https://primary', params: { sort: 'trending' } });
    expect(calls).to.deep.equal([
      'https://primary bridge.get_ranked_posts',
      'https://primary bridge.get_ranked_posts'
    ]);
    expect(created).to.deep.equal([{ node: 'https://primary', timeoutMs: FAILOVER_ATTEMPT_TIMEOUT_MS }]);
  });

  it('fails over to the fallback nodes in order, skipping the primary in the list', async () => {
    const { chain, calls } = setup({
      'https://primary': ['transport'],
      'https://fallback-a': ['transport'],
      'https://fallback-b': ['ok']
    });

    const result = await chain.api.bridge.get_ranked_posts({ sort: 'hot' });

    expect(result).to.deep.equal({ node: 'https://fallback-b', params: { sort: 'hot' } });
    expect(calls).to.deep.equal([
      'https://primary bridge.get_ranked_posts',
      'https://primary bridge.get_ranked_posts',
      'https://fallback-a bridge.get_ranked_posts',
      'https://fallback-b bridge.get_ranked_posts'
    ]);
  });

  it('reuses one chain per node across calls', async () => {
    const { chain, created } = setup({ 'https://primary': ['transport', 'ok', 'transport', 'ok'] });

    await chain.api.bridge.get_ranked_posts({});
    await chain.api.bridge.get_ranked_posts({});

    expect(created.map(({ node }) => node)).to.deep.equal(['https://primary']);
  });

  it('never retries a definitive API answer', async () => {
    const { chain, calls } = setup({ 'https://primary': ['missing'] });

    const error = await chain.api.bridge.get_ranked_posts({}).catch((e: unknown) => e);

    expect(error).to.be.instanceOf(Error).with.property('name', 'WaxChainApiError');
    expect(calls).to.have.length(1);
  });

  it('stops on a definitive answer from a fallback node instead of trying further nodes', async () => {
    const { chain, calls } = setup({ 'https://primary': ['transport'], 'https://fallback-a': ['missing'] });

    const error = await chain.api.bridge.get_ranked_posts({}).catch((e: unknown) => e);

    expect(error).to.have.property('name', 'WaxChainApiError');
    expect(calls).to.have.length(3);
  });

  it('never re-sends a broadcast', async () => {
    const { chain, calls } = setup({ 'https://primary': ['transport', 'ok'] });

    const error = await chain.api.network_broadcast_api.broadcast_transaction({}).catch((e: unknown) => e);

    expect(error).to.be.instanceOf(WaxRequestError);
    expect(calls).to.deep.equal(['https://primary broadcast_transaction']);
  });

  it('rethrows the last transport error once every node failed', async () => {
    const { chain, calls } = setup({});

    const error = await chain.api.bridge.get_ranked_posts({}).catch((e: unknown) => e);

    expect(error)
      .to.be.instanceOf(WaxRequestError)
      .with.property('message', 'fetch failed: https://fallback-b');
    expect(calls).to.have.length(4);
  });

  it('does not start an attempt that could overrun the time budget', async () => {
    // Each failure takes a full attempt timeout, so only part of the node list fits the budget.
    const { chain, calls, elapsed } = setup({}, { latencyMs: FAILOVER_ATTEMPT_TIMEOUT_MS });

    await chain.api.bridge.get_ranked_posts({}).catch(() => undefined);

    expect(elapsed()).to.be.at.most(FAILOVER_BUDGET_MS);
    expect(calls.length).to.be.lessThan(4);
  });

  describe('remembering failed nodes', () => {
    const ranked = 'bridge.get_ranked_posts';

    it('sends later calls straight to the fallback once the primary timed out', async () => {
      const { chain, calls, elapsed } = setup(
        { 'https://primary': ['transport'], 'https://fallback-a': ['ok'] },
        { nodeLatencyMs: { 'https://primary': FAILOVER_ATTEMPT_TIMEOUT_MS } }
      );
      await chain.api.bridge.get_ranked_posts({});
      calls.length = 0;
      const before = elapsed();

      const results = [await chain.api.bridge.get_ranked_posts({}), await chain.api.bridge.get_ranked_posts({})];

      expect(results.map((result) => (result as { node: string }).node)).to.deep.equal([
        'https://fallback-a',
        'https://fallback-a'
      ]);
      expect(calls).to.deep.equal([`https://fallback-a ${ranked}`, `https://fallback-a ${ranked}`]);
      expect(elapsed() - before).to.equal(200);
    });

    it('probes the primary after the cooldown and prefers it again once it answers', async () => {
      const { chain, calls, advance } = setup({
        'https://primary': ['transport', 'transport', 'ok'],
        'https://fallback-a': ['ok']
      });
      await chain.api.bridge.get_ranked_posts({});
      calls.length = 0;

      advance(NODE_COOLDOWN_MS / 2);
      const duringCooldown = await chain.api.bridge.get_ranked_posts({});
      advance(NODE_COOLDOWN_MS / 2);
      const probed = await chain.api.bridge.get_ranked_posts({});
      const next = await chain.api.bridge.get_ranked_posts({});

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
      const { chain, calls, advance } = setup({ 'https://fallback-a': ['ok'] });
      await chain.api.bridge.get_ranked_posts({});
      advance(NODE_COOLDOWN_MS);
      calls.length = 0;

      await chain.api.bridge.get_ranked_posts({});
      advance(NODE_COOLDOWN_MS / 2);
      await chain.api.bridge.get_ranked_posts({});

      expect(calls).to.deep.equal([
        `https://primary ${ranked}`,
        `https://fallback-a ${ranked}`,
        `https://fallback-a ${ranked}`
      ]);
    });

    it('lets only one of concurrent calls probe a recovering node', async () => {
      const { chain, calls, advance } = setup({ 'https://fallback-a': ['ok'] });
      await chain.api.bridge.get_ranked_posts({});
      advance(NODE_COOLDOWN_MS);
      calls.length = 0;

      await Promise.all([chain.api.bridge.get_ranked_posts({}), chain.api.bridge.get_ranked_posts({})]);

      expect(calls.filter((call) => call.startsWith('https://primary'))).to.have.length(1);
    });

    it('tries every node again, as before, when all of them are down', async () => {
      const { chain, calls } = setup({});
      await chain.api.bridge.get_ranked_posts({}).catch(() => undefined);
      calls.length = 0;

      const error = await chain.api.bridge.get_ranked_posts({}).catch((e: unknown) => e);

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
      const { chain, calls } = setup({ 'https://primary': ['transport', 'ok'] });
      await chain.api.bridge.get_ranked_posts({});
      calls.length = 0;

      await chain.api.bridge.get_ranked_posts({});

      expect(calls).to.deep.equal([`https://primary ${ranked}`]);
    });
  });

  describe('onFailover', () => {
    it('reports the node that served a call the primary failed', async () => {
      const servedBy: string[] = [];
      const { chain } = setup(
        { 'https://primary': ['transport'], 'https://fallback-a': ['ok'] },
        { hooks: { onFailover: (node) => servedBy.push(node) } }
      );

      await chain.api.bridge.get_ranked_posts({});

      expect(servedBy).to.deep.equal(['https://fallback-a']);
    });

    it('stays silent when the primary answered, also after a retry', async () => {
      const servedBy: string[] = [];
      const { chain } = setup(
        { 'https://primary': ['transport', 'ok'] },
        { hooks: { onFailover: (node) => servedBy.push(node) } }
      );

      await chain.api.bridge.get_ranked_posts({});
      await chain.api.bridge.get_ranked_posts({});

      expect(servedBy).to.deep.equal([]);
    });

    it('stays silent when every node failed', async () => {
      const servedBy: string[] = [];
      const { chain } = setup({}, { hooks: { onFailover: (node) => servedBy.push(node) } });

      await chain.api.bridge.get_ranked_posts({}).catch(() => undefined);

      expect(servedBy).to.deep.equal([]);
    });
  });

  it('decides what fails over with the given transport-error check instead of wax\'s', async () => {
    const { chain, calls } = setup(
      { 'https://primary': ['missing'], 'https://fallback-a': ['ok'] },
      { hooks: { isTransportError: (error) => error instanceof Error && error.name === 'WaxChainApiError' } }
    );

    const result = await chain.api.bridge.get_ranked_posts({});

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

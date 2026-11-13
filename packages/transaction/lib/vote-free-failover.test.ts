import { describe, it } from 'mocha';
import { expect } from 'chai';
import { NodeHealth } from './node-health';
import { JsonRpcApiError } from './read-client';
import {
  firstJsonRpcNode,
  HEDGE_DELAY_MS,
  jsonRpcHealthKey,
  wrapChainWithServerFailover
} from './server-failover';
import { createVoteFreeSupport, readVoteFree } from './vote-free-posts';

/**
 * The vote-free bridge reads over a failing-over chain: which form each read sends where, when the
 * node checked for `_v2` is picked as `firstJsonRpcNode` picks it, or is the first node whatever
 * failover does (as a lite or search read's node is).
 */

const FIRST = 'https://first';
const SECOND = 'https://second';
const THIRD = 'https://third';
const FAMILY = 'bridge';

class FakeTransportError extends Error {}

interface IFakeChain {
  api: { bridge: { get_post: () => Promise<string>; get_post_v2: () => Promise<string> } };
  endpointUrl: string;
  chainId: string;
}

const unknownMethod = (node: string) =>
  new JsonRpcApiError(
    'bridge.get_post_v2',
    { error: { code: -32602, message: 'Assert Exception:unknown method: bridge_apiget_post_v2' } },
    node
  );

interface ISetupOptions {
  /** Nodes failing every request on transport. */
  failing?: readonly string[];
  /** The node a read is checked for `_v2` on: the first node failover will admit, else this one. */
  target?: string;
  nodes?: readonly string[];
}

const setup = (
  servesVoteFree: Record<string, boolean>,
  { failing = [], target, nodes = [FIRST, SECOND] }: ISetupOptions = {}
) => {
  const health = new NodeHealth();
  const support = createVoteFreeSupport();
  const calls: string[] = [];

  const makeChain = (node: string): IFakeChain => ({
    endpointUrl: node,
    chainId: 'beeab0de',
    api: {
      bridge: {
        get_post: async () => {
          calls.push(`${node} get_post`);
          if (failing.includes(node)) throw new FakeTransportError(node);
          return 'stock';
        },
        get_post_v2: async () => {
          calls.push(`${node} get_post_v2`);
          if (failing.includes(node)) throw new FakeTransportError(node);
          if (!servesVoteFree[node]) throw unknownMethod(node);
          return 'vote-free';
        }
      }
    }
  });

  const chain = wrapChainWithServerFailover(makeChain(nodes[0]), {
    fallbackNodes: nodes.slice(1),
    createNodeChain: makeChain,
    health,
    isTransportError: (error) => error instanceof FakeTransportError,
    routeFor: async () => ({ nodes, family: FAMILY }),
    // No hedge ever starts (each node answers at once); a retry pause ends at once.
    sleep: (ms) => (ms === HEDGE_DELAY_MS ? new Promise(() => {}) : Promise.resolve())
  });

  const read = () =>
    readVoteFree(
      support,
      target ?? firstJsonRpcNode(health, nodes, FAMILY) ?? FIRST,
      chain.api.bridge,
      (api) => api.get_post_v2(),
      (api) => api.get_post()
    );

  return { health, support, calls, read };
};

describe('vote-free bridge reads over failover', () => {
  it('reads only the stock form from the node failover sends to once it lacks `_v2`, while the first node is down', async () => {
    const { health, support, calls, read } = setup({ [FIRST]: true, [SECOND]: false });
    health.markDown(jsonRpcHealthKey(FIRST, FAMILY));

    expect(await read()).to.equal('stock');
    expect(await read()).to.equal('stock');
    expect(await read()).to.equal('stock');

    expect(support.lacks(SECOND)).to.equal(true);
    expect(support.lacks(FIRST)).to.equal(false);
    expect(calls).to.deep.equal([
      `${SECOND} get_post_v2`,
      `${SECOND} get_post`,
      `${SECOND} get_post`,
      `${SECOND} get_post`
    ]);
  });

  it('keeps reading the vote-free form from a healthy first node that serves it', async () => {
    const { calls, read } = setup({ [FIRST]: true, [SECOND]: false });

    expect(await read()).to.equal('vote-free');
    expect(await read()).to.equal('vote-free');

    expect(calls).to.deep.equal([`${FIRST} get_post_v2`, `${FIRST} get_post_v2`]);
  });

  describe('checked for `_v2` on the first node while it fails', () => {
    const v2Asked = (calls: string[], node: string) => calls.filter((call) => call === `${node} get_post_v2`);

    it('asks a node it fails over to, once found lacking `_v2`, only the stock form', async () => {
      const { support, calls, read } = setup({ [FIRST]: true, [SECOND]: false }, { failing: [FIRST], target: FIRST });

      expect(await read()).to.equal('stock');
      expect(await read()).to.equal('stock');
      expect(await read()).to.equal('stock');

      expect(support.lacks(SECOND)).to.equal(true);
      expect(support.lacks(FIRST)).to.equal(false);
      expect(v2Asked(calls, SECOND)).to.deep.equal([`${SECOND} get_post_v2`]);
      expect(calls.filter((call) => call.startsWith(SECOND))).to.deep.equal([
        `${SECOND} get_post_v2`,
        `${SECOND} get_post`,
        `${SECOND} get_post`,
        `${SECOND} get_post`
      ]);
    });

    it('asks the stock form of a lacking node also when failover probes the first node again', async () => {
      const { health, calls, read } = setup({ [FIRST]: true, [SECOND]: false }, { failing: [FIRST], target: FIRST });

      await read();
      // The first node's cooldown has passed: failover probes it, and it fails again.
      health.markUp(jsonRpcHealthKey(FIRST, FAMILY));
      expect(await read()).to.equal('stock');

      expect(v2Asked(calls, SECOND)).to.deep.equal([`${SECOND} get_post_v2`]);
      expect(v2Asked(calls, FIRST)).to.have.length.greaterThan(1);
    });

    it('reads vote-free from a node it fails over to that serves `_v2`', async () => {
      const { calls, read } = setup({ [FIRST]: true, [THIRD]: true }, { failing: [FIRST], target: FIRST, nodes: [FIRST, THIRD] });

      expect(await read()).to.equal('vote-free');
      expect(await read()).to.equal('vote-free');

      expect(calls.filter((call) => call.startsWith(THIRD))).to.deep.equal([`${THIRD} get_post_v2`, `${THIRD} get_post_v2`]);
    });
  });
});

describe('firstJsonRpcNode', () => {
  it('skips a node down for the family or unreachable, and not one down for another family', () => {
    const health = new NodeHealth();

    expect(firstJsonRpcNode(health, [FIRST, SECOND], FAMILY)).to.equal(FIRST);
    health.markDown(jsonRpcHealthKey(FIRST, 'core'));
    expect(firstJsonRpcNode(health, [FIRST, SECOND], FAMILY)).to.equal(FIRST);
    health.markDown(`${FIRST}/unreachable`);
    expect(firstJsonRpcNode(health, [FIRST, SECOND], FAMILY)).to.equal(SECOND);
  });

  it('takes the node healthy most recently when every node is down, as the failover sweep does', () => {
    const health = new NodeHealth();
    health.markUp(jsonRpcHealthKey(SECOND, FAMILY));
    health.markDown(jsonRpcHealthKey(FIRST, FAMILY));
    health.markDown(jsonRpcHealthKey(SECOND, FAMILY));

    expect(firstJsonRpcNode(health, [FIRST, SECOND], FAMILY)).to.equal(SECOND);
    expect(firstJsonRpcNode(health, [], FAMILY)).to.equal(undefined);
  });
});

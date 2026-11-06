import { describe, it } from 'mocha';
import { expect } from 'chai';
import { NodeHealth } from './node-health';
import { JsonRpcApiError } from './read-client';
import { firstJsonRpcNode, jsonRpcHealthKey, wrapChainWithServerFailover } from './server-failover';
import { createVoteFreeSupport, readVoteFree } from './vote-free-posts';

/**
 * The vote-free bridge reads over a failing-over chain: which form each read sends where, when the
 * node checked for `_v2` is picked as `firstJsonRpcNode` picks it.
 */

const FIRST = 'https://first';
const SECOND = 'https://second';
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

const setup = (servesVoteFree: Record<string, boolean>) => {
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
          return 'stock';
        },
        get_post_v2: async () => {
          calls.push(`${node} get_post_v2`);
          if (!servesVoteFree[node]) throw unknownMethod(node);
          return 'vote-free';
        }
      }
    }
  });

  const chain = wrapChainWithServerFailover(makeChain(FIRST), {
    fallbackNodes: [SECOND],
    createNodeChain: makeChain,
    health,
    isTransportError: (error) => error instanceof FakeTransportError,
    routeFor: async () => ({ nodes: [FIRST, SECOND], family: FAMILY }),
    // No hedge or retry pause ever ends: each node answers at once.
    sleep: () => new Promise(() => {})
  });

  const read = () =>
    readVoteFree(
      support,
      firstJsonRpcNode(health, [FIRST, SECOND], FAMILY) ?? FIRST,
      () => chain.api.bridge.get_post_v2(),
      () => chain.api.bridge.get_post()
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

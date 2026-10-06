import { describe, it } from 'mocha';
import { expect } from 'chai';
import { wrapChainWithRequestApiNode } from './request-api-node';

const DEFAULT_NODE = 'https://api.hive.blog';
const NODE_A = 'https://api.openhive.network';
const NODE_B = 'https://anyx.io';

type FakeChain = {
  api: { bridge: { get_post: ((params: unknown) => Promise<unknown>) & { endpointUrl: string } } };
  restApi: { marker: string };
  endpointUrl: string;
};

function makeChain(endpoint: string, calls: string[]): FakeChain {
  const getPost = Object.assign(
    async (params: unknown) => {
      calls.push(endpoint);
      return { endpoint, params };
    },
    { endpointUrl: endpoint }
  );
  return { api: { bridge: { get_post: getPost } }, restApi: { marker: endpoint }, endpointUrl: endpoint };
}

describe('wrapChainWithRequestApiNode', () => {
  const setup = () => {
    const calls: string[] = [];
    const defaultChain = makeChain(DEFAULT_NODE, calls);
    const nodeChains = new Map<string, FakeChain>();
    let currentNode: string | undefined;
    const chain = wrapChainWithRequestApiNode(defaultChain, {
      resolveNode: async () => currentNode,
      chainForNode: (node) => {
        let nodeChain = nodeChains.get(node);
        if (!nodeChain) {
          nodeChain = makeChain(node, calls);
          nodeChains.set(node, nodeChain);
        }
        return nodeChain;
      }
    });
    return { calls, chain, nodeChains, setNode: (node: string | undefined) => (currentNode = node) };
  };

  it('uses the default node when the request has no preference', async () => {
    const { chain, calls } = setup();
    const result = await chain.api.bridge.get_post({ author: 'a' });
    expect(result).to.deep.equal({ endpoint: DEFAULT_NODE, params: { author: 'a' } });
    expect(calls).to.deep.equal([DEFAULT_NODE]);
  });

  it("sends a call to the request's node, resolved when the call is made", async () => {
    const { chain, calls, setNode } = setup();
    const getPost = chain.api.bridge.get_post; // obtained before the node is known
    setNode(NODE_A);
    await getPost({});
    expect(calls).to.deep.equal([NODE_A]);
  });

  it('does not carry one request node over to the next request', async () => {
    const { chain, calls, setNode } = setup();
    setNode(NODE_A);
    await chain.api.bridge.get_post({});
    setNode(undefined);
    await chain.api.bridge.get_post({});
    setNode(NODE_B);
    await chain.api.bridge.get_post({});
    expect(calls).to.deep.equal([NODE_A, DEFAULT_NODE, NODE_B]);
  });

  it('keeps the shared object and its sync properties on the default node', async () => {
    const { chain, setNode } = setup();
    setNode(NODE_A);
    await chain.api.bridge.get_post({});
    expect(chain.endpointUrl).to.equal(DEFAULT_NODE);
    expect(chain.api.bridge.get_post.endpointUrl).to.equal(DEFAULT_NODE);
    expect(chain.restApi.marker).to.equal(DEFAULT_NODE);
  });

  it('is not thenable, so awaiting the api object does not call it', async () => {
    const { chain, calls } = setup();
    expect((chain.api as unknown as { then?: unknown }).then).to.equal(undefined);
    expect(calls).to.deep.equal([]);
  });
});

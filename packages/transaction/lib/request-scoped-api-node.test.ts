import { describe, it } from 'mocha';
import { expect } from 'chai';
import { chainForApiNode } from '../../common-hiveio-packages/src/wax/request-scoped-api-node';

const DEFAULT_NODE = 'https://api.hive.blog';
const NODE_A = 'https://api.openhive.network';
const NODE_B = 'https://anyx.io';

type FakeChain = {
  api: { endpointUrl: string };
  extendConfig: (config: { apiEndpoint: string }) => FakeChain;
  sets: number;
};

function makeChain(endpoint: string): FakeChain {
  const chain = {
    sets: 0,
    endpoint,
    api: {} as FakeChain['api'],
    extendConfig(config: { apiEndpoint: string }) {
      return makeChain(config.apiEndpoint);
    }
  };
  Object.defineProperty(chain.api, 'endpointUrl', {
    get() {
      return chain.endpoint;
    },
    set(value: string) {
      chain.sets += 1;
      chain.endpoint = value;
    }
  });
  return chain as FakeChain;
}

describe('chainForApiNode', () => {
  it('returns the shared client when the request has no preference', () => {
    const shared = makeChain(DEFAULT_NODE);
    expect(chainForApiNode(shared, undefined, true)).to.equal(shared);
    expect(shared.sets).to.equal(0);
    expect(shared.api.endpointUrl).to.equal(DEFAULT_NODE);
  });

  it('does not mutate the shared client for an SSR cookie', () => {
    const shared = makeChain(DEFAULT_NODE);
    const view = chainForApiNode(shared, NODE_A, true);
    expect(view).to.not.equal(shared);
    expect(view.api.endpointUrl).to.equal(NODE_A);
    expect(shared.api.endpointUrl).to.equal(DEFAULT_NODE);
    expect(shared.sets).to.equal(0);
  });

  it('keeps a later request without a cookie on the shared client', () => {
    const shared = makeChain(DEFAULT_NODE);
    const first = chainForApiNode(shared, NODE_A, true);
    const second = chainForApiNode(shared, undefined, true);
    expect(first.api.endpointUrl).to.equal(NODE_A);
    expect(second).to.equal(shared);
    expect(shared.api.endpointUrl).to.equal(DEFAULT_NODE);
    expect(shared.sets).to.equal(0);
  });

  it('gives concurrent SSR preferences distinct clients', () => {
    const shared = makeChain(DEFAULT_NODE);
    const a = chainForApiNode(shared, NODE_A, true);
    const b = chainForApiNode(shared, NODE_B, true);
    expect(a.api.endpointUrl).to.equal(NODE_A);
    expect(b.api.endpointUrl).to.equal(NODE_B);
    expect(shared.api.endpointUrl).to.equal(DEFAULT_NODE);
    expect(shared.sets).to.equal(0);
  });

  it('still points the browser singleton at the localStorage node', () => {
    const shared = makeChain(DEFAULT_NODE);
    const result = chainForApiNode(shared, NODE_A, false);
    expect(result).to.equal(shared);
    expect(shared.api.endpointUrl).to.equal(NODE_A);
    expect(shared.sets).to.equal(1);
  });
});

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createApiNodeViews } from '../../common-hiveio-packages/src/wax/request-scoped-api-node';

const DEFAULT_NODE = 'https://api.hive.blog';
const NODE_A = 'https://api.openhive.network';
const NODE_B = 'https://anyx.io';

type FakeChain = {
  api: { endpointUrl: string };
  extendConfig: (config: { apiEndpoint: string }) => FakeChain;
  sets: number;
  extends: number;
};

function makeChain(endpoint: string): FakeChain {
  const chain = {
    sets: 0,
    extends: 0,
    endpoint,
    api: {} as FakeChain['api'],
    extendConfig(config: { apiEndpoint: string }) {
      chain.extends += 1;
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

const extend = (shared: FakeChain, node: string) => shared.extendConfig({ apiEndpoint: node });

describe('createApiNodeViews', () => {
  it('returns the shared client when the request has no preference', () => {
    const viewFor = createApiNodeViews<FakeChain>(extend);
    const shared = makeChain(DEFAULT_NODE);
    expect(viewFor(shared, undefined)).to.equal(shared);
    expect(viewFor(shared, DEFAULT_NODE)).to.equal(shared);
    expect(shared.sets).to.equal(0);
    expect(shared.extends).to.equal(0);
  });

  it('does not mutate the shared client for an SSR cookie', () => {
    const viewFor = createApiNodeViews<FakeChain>(extend);
    const shared = makeChain(DEFAULT_NODE);
    const view = viewFor(shared, NODE_A);
    expect(view).to.not.equal(shared);
    expect(view.api.endpointUrl).to.equal(NODE_A);
    expect(shared.api.endpointUrl).to.equal(DEFAULT_NODE);
    expect(shared.sets).to.equal(0);
  });

  it('keeps a later request without a cookie on the shared client', () => {
    const viewFor = createApiNodeViews<FakeChain>(extend);
    const shared = makeChain(DEFAULT_NODE);
    const first = viewFor(shared, NODE_A);
    const second = viewFor(shared, undefined);
    expect(first.api.endpointUrl).to.equal(NODE_A);
    expect(second).to.equal(shared);
    expect(shared.api.endpointUrl).to.equal(DEFAULT_NODE);
  });

  it('gives concurrent SSR preferences distinct clients', () => {
    const viewFor = createApiNodeViews<FakeChain>(extend);
    const shared = makeChain(DEFAULT_NODE);
    const a = viewFor(shared, NODE_A);
    const b = viewFor(shared, NODE_B);
    expect(a.api.endpointUrl).to.equal(NODE_A);
    expect(b.api.endpointUrl).to.equal(NODE_B);
    expect(shared.api.endpointUrl).to.equal(DEFAULT_NODE);
    expect(shared.sets).to.equal(0);
  });

  it('builds one view per node instead of one per request (wasm state is never freed)', () => {
    const created: string[] = [];
    const viewFor = createApiNodeViews<FakeChain>(extend, (node) => created.push(node));
    const shared = makeChain(DEFAULT_NODE);
    const first = viewFor(shared, NODE_A);
    const again = viewFor(shared, NODE_A);
    expect(again).to.equal(first);
    expect(shared.extends).to.equal(1);
    expect(created).to.deep.equal([NODE_A]);
  });

  it('builds fresh views for a new shared client (after a wasm reset)', () => {
    const viewFor = createApiNodeViews<FakeChain>(extend);
    const before = viewFor(makeChain(DEFAULT_NODE), NODE_A);
    const replacement = makeChain(DEFAULT_NODE);
    const after = viewFor(replacement, NODE_A);
    expect(after).to.not.equal(before);
    expect(replacement.extends).to.equal(1);
  });
});

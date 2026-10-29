import { describe, it } from 'mocha';
import { expect } from 'chai';
import { HEDGE_DELAY_MS, wrapChainWithServerFailover } from './server-failover';
import { NodeHealth } from './node-health';
import { JsonRpcApiError } from './read-client';
import { ReadTransportError } from './read-transport';

/** `lite.*` is served by some nodes only: "Api not found" there means "ask the next node". */

type Answer = 'ok' | 'api-not-found' | 'jussi-unmapped' | 'missing';

interface IFakeChain {
  endpointUrl: string;
  api: {
    lite: { get_post: (params: unknown) => Promise<unknown> };
    bridge: { get_post: (params: unknown) => Promise<unknown> };
  };
}

const PRIMARY = 'https://primary';
const SECOND = 'https://second';

const ERRORS: Record<Exclude<Answer, 'ok'>, object> = {
  'api-not-found': { code: -32601, message: 'Api not found lite' },
  'jussi-unmapped': { code: -32603, message: 'Unable to map request to endpoint.' },
  missing: { code: -32602, message: 'Post does not exist' }
};

const setup = (answers: Record<string, Answer>) => {
  const health = new NodeHealth();
  const calls: string[] = [];
  const makeChain = (node: string): IFakeChain => {
    const answer = (method: string) => async () => {
      calls.push(`${node} ${method}`);
      const outcome = answers[node];
      if (outcome === 'ok') return { node };
      throw new JsonRpcApiError(method, { error: ERRORS[outcome] });
    };
    return {
      endpointUrl: node,
      api: { lite: { get_post: answer('lite.get_post') }, bridge: { get_post: answer('bridge.get_post') } }
    };
  };
  const chain = wrapChainWithServerFailover(makeChain(PRIMARY), {
    fallbackNodes: [SECOND],
    health,
    createNodeChain: (node) => makeChain(node),
    isTransportError: (error) => error instanceof ReadTransportError,
    now: () => 0,
    // Retries run at once; a hedge never starts, so a node is asked only after the previous one failed.
    sleep: (ms) => (ms === HEDGE_DELAY_MS ? new Promise<void>(() => undefined) : Promise.resolve())
  });
  return { chain, calls, health };
};

describe('wrapChainWithServerFailover: lite.*', () => {
  for (const answer of ['api-not-found', 'jussi-unmapped'] as const) {
    it(`asks the next node when the primary answers lite.* with ${answer}`, async () => {
      const { chain, calls } = setup({ [PRIMARY]: answer, [SECOND]: 'ok' });

      expect(await chain.api.lite.get_post({})).to.deep.equal({ node: SECOND });
      expect(calls[calls.length - 1]).to.equal(`${SECOND} lite.get_post`);
    });
  }

  it('records the node as lacking lite.* only, so it keeps serving bridge.*', async () => {
    const { chain, health } = setup({ [PRIMARY]: 'api-not-found', [SECOND]: 'ok' });

    await chain.api.lite.get_post({});

    expect(health.isDown(`${PRIMARY}/lite`)).to.equal(true);
    expect(health.isDown(PRIMARY)).to.equal(false);
  });

  it('treats "Api not found" on bridge.* as a definitive answer', async () => {
    const { chain, calls } = setup({ [PRIMARY]: 'api-not-found', [SECOND]: 'ok' });

    const error = await chain.api.bridge.get_post({}).catch((e: unknown) => e);

    expect(error).to.be.instanceOf(JsonRpcApiError);
    expect(calls).to.deep.equal([`${PRIMARY} bridge.get_post`]);
  });

  it('treats any other lite.* error as a definitive answer', async () => {
    const { chain, calls } = setup({ [PRIMARY]: 'missing', [SECOND]: 'ok' });

    const error = await chain.api.lite.get_post({}).catch((e: unknown) => e);

    expect(error).to.be.instanceOf(JsonRpcApiError).with.property('message', 'lite.get_post: Post does not exist');
    expect(calls).to.deep.equal([`${PRIMARY} lite.get_post`]);
  });
});

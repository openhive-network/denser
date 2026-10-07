import { expect } from 'chai';
import { createReadClient, IReadRequest, IReadTransport, JsonRpcApiError } from './read-client';
import { ReadTransportError } from './read-transport';
import { retryReadOnce } from './read-retry';

/**
 * A slow read gets its own timeout through `withTimeout` and one repeated attempt through
 * `retryReadOnce`, while every other read keeps the client's configured timeout.
 */

const CONFIG_TIMEOUT_MS = 5_000;
const SLOW_CALL_TIMEOUT_MS = 15_000;
const REST_DEFINITION = {
  'hivemind-api': { accountsOperations: { urlPath: 'accounts/{account-name}/operations' } }
};

interface IApiTree {
  [key: string]: IApiTree & ((params?: unknown) => Promise<unknown>);
}

const transportError = (request: IReadRequest, status?: number) =>
  new ReadTransportError(`failed with ${status ?? 'a timeout'}`, request, status);

/** A transport answering with `answers` in turn (an Error is thrown), recording each request. */
const createScriptedTransport = (answers: Array<(request: IReadRequest) => unknown>) => {
  const requests: IReadRequest[] = [];
  const transport: IReadTransport = {
    async request(request) {
      requests.push(request);
      const answer = answers[Math.min(requests.length - 1, answers.length - 1)](request);
      if (answer instanceof Error) throw answer;
      return { response: answer };
    }
  };
  return { requests, transport };
};

const createClient = (transport: IReadTransport) =>
  createReadClient<IApiTree, IApiTree>({
    getConfig: () => ({
      chainId: 'chain',
      apiEndpoint: 'https://api.example',
      restApiEndpoint: 'https://rest.example',
      timeoutMs: CONFIG_TIMEOUT_MS
    }),
    transport,
    restApiDefinition: REST_DEFINITION
  });

const readOperations = (client: { restApi: IApiTree }) =>
  client.restApi['hivemind-api'].accountsOperations({ 'account-name': 'gtg', 'page-size': 100 });

describe('read client per-call timeout', () => {
  it('sends the requests of a withTimeout client with that timeout, others with the configured one', async () => {
    const { requests, transport } = createScriptedTransport([() => ({ operations_result: [] })]);
    const client = createClient(transport);

    await readOperations(client.withTimeout(SLOW_CALL_TIMEOUT_MS));
    await readOperations(client);

    expect(requests.map(({ url, timeout }) => ({ url, timeout }))).to.deep.equal([
      { url: '/hivemind-api/accounts/gtg/operations?page-size=100', timeout: SLOW_CALL_TIMEOUT_MS },
      { url: '/hivemind-api/accounts/gtg/operations?page-size=100', timeout: CONFIG_TIMEOUT_MS }
    ]);
  });

  it('applies the timeout to JSON-RPC calls of the withTimeout client too', async () => {
    const { requests, transport } = createScriptedTransport([() => ({ result: {} })]);

    await createClient(transport).withTimeout(SLOW_CALL_TIMEOUT_MS).api.database_api.get_feed_history();

    expect(requests.map(({ timeout }) => timeout)).to.deep.equal([SLOW_CALL_TIMEOUT_MS]);
  });
});

describe('retryReadOnce', () => {
  const recordSleeps = () => {
    const sleeps: number[] = [];
    return { sleeps, sleep: async (ms: number) => void sleeps.push(ms) };
  };

  it('repeats a timed-out read once after the delay and resolves with its answer', async () => {
    const answer = { operations_result: [{ operation_id: '1' }] };
    const { requests, transport } = createScriptedTransport([
      (request) => transportError(request),
      () => answer
    ]);
    const { sleeps, sleep } = recordSleeps();

    const result = await retryReadOnce(() => readOperations(createClient(transport)), {
      delayMs: 1_000,
      sleep
    });

    expect(result).to.deep.equal(answer);
    expect(requests).to.have.length(2);
    expect(sleeps).to.deep.equal([1_000]);
  });

  it('gives up after the second failure with its error', async () => {
    const { requests, transport } = createScriptedTransport([
      (request) => transportError(request, 500),
      (request) => transportError(request, 503)
    ]);
    const { sleep } = recordSleeps();

    const failure = await retryReadOnce(() => readOperations(createClient(transport)), { sleep }).catch(
      (error: unknown) => error
    );

    expect(failure).to.be.instanceOf(ReadTransportError);
    expect((failure as ReadTransportError).status).to.equal(503);
    expect(requests).to.have.length(2);
  });

  it('does not repeat a 4xx answer', async () => {
    const { requests, transport } = createScriptedTransport([(request) => transportError(request, 404)]);
    const { sleeps, sleep } = recordSleeps();

    const failure = await retryReadOnce(() => readOperations(createClient(transport)), { sleep }).catch(
      (error: unknown) => error
    );

    expect((failure as ReadTransportError).status).to.equal(404);
    expect(requests).to.have.length(1);
    expect(sleeps).to.deep.equal([]);
  });

  it('does not repeat a definitive API answer', async () => {
    const { requests, transport } = createScriptedTransport([
      () => ({ error: { message: 'no such account' } })
    ]);
    const { sleep } = recordSleeps();

    const failure = await retryReadOnce(() => createClient(transport).api.database_api.find_accounts({}), {
      sleep
    }).catch((error: unknown) => error);

    expect(failure).to.be.instanceOf(JsonRpcApiError);
    expect(requests).to.have.length(1);
  });
});

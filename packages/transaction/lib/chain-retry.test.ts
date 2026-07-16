import { describe, it, beforeEach } from 'mocha';
import { expect } from 'chai';
import { wrapChainWithRetry } from './chain-retry';

/**
 * Unit coverage for the retry/failover wrapper added for hive/denser#761: a transport
 * error (5xx / timeout) on a read call should be retried against the primary endpoint,
 * then fail over through the ordered backup endpoint list - all while non-transport
 * errors (definitive API answers) and network_broadcast_api are left completely untouched.
 */

class FakeTransportError extends Error {
  constructor() {
    super('#503');
    this.name = 'WaxNon_2XX_3XX_ResponseCodeError';
  }
}

class FakeChainApiError extends Error {
  constructor() {
    super('post does not exist');
    this.name = 'WaxChainApiError';
  }
}

function makeFakeApi(endpointUrl: string, callImpl: () => Promise<string>) {
  let endpoint = endpointUrl;
  return {
    get endpointUrl() {
      return endpoint;
    },
    set endpointUrl(value: string) {
      endpoint = value;
    },
    bridge: {
      get_post: (..._args: unknown[]) => callImpl()
    },
    network_broadcast_api: {
      broadcast_transaction: (..._args: unknown[]) => callImpl()
    }
  };
}

describe('wrapChainWithRetry', function () {
  // Exercises the real exponential backoff (500ms, 1000ms) between retries on the primary
  // endpoint, so this needs more headroom than mocha's 2000ms default.
  this.timeout(5000);

  let calls: number;

  beforeEach(() => {
    calls = 0;
  });

  it('returns the result immediately on success without retrying', async () => {
    const api = makeFakeApi('https://primary', async () => {
      calls++;
      return 'ok';
    });
    const chain = wrapChainWithRetry({ api, restApi: {} } as any);

    const result = await chain.api.bridge.get_post();

    expect(result).to.equal('ok');
    expect(calls).to.equal(1);
  });

  it('retries a transport error on the primary endpoint before succeeding', async () => {
    const api = makeFakeApi('https://primary', async () => {
      calls++;
      if (calls < 3) throw new FakeTransportError();
      return 'ok';
    });
    const chain = wrapChainWithRetry({ api, restApi: {} } as any);

    const result = await chain.api.bridge.get_post();

    expect(result).to.equal('ok');
    expect(calls).to.equal(3);
    expect(api.endpointUrl).to.equal('https://primary');
  });

  it('does not retry a non-transport (definitive) error', async () => {
    const api = makeFakeApi('https://primary', async () => {
      calls++;
      throw new FakeChainApiError();
    });
    const chain = wrapChainWithRetry({ api, restApi: {} } as any);

    let caught: unknown;
    try {
      await chain.api.bridge.get_post();
    } catch (error) {
      caught = error;
    }

    expect(caught).to.be.instanceOf(FakeChainApiError);
    expect(calls).to.equal(1);
  });

  it('fails over to the backup endpoint once retries on the primary are exhausted', async () => {
    const api = makeFakeApi('https://primary', async () => {
      calls++;
      if (api.endpointUrl === 'https://backup') return 'ok-from-backup';
      throw new FakeTransportError();
    });
    const chain = wrapChainWithRetry({ api, restApi: {} } as any, { api: ['https://backup'] });

    const result = await chain.api.bridge.get_post();

    expect(result).to.equal('ok-from-backup');
    expect(api.endpointUrl).to.equal('https://backup');
  });

  it('throws the last error when both the primary and the backup endpoint fail', async () => {
    const api = makeFakeApi('https://primary', async () => {
      calls++;
      throw new FakeTransportError();
    });
    const chain = wrapChainWithRetry({ api, restApi: {} } as any, { api: ['https://backup'] });

    let caught: unknown;
    try {
      await chain.api.bridge.get_post();
    } catch (error) {
      caught = error;
    }

    expect(caught).to.be.instanceOf(FakeTransportError);
    expect(api.endpointUrl).to.equal('https://backup');
  });

  it('does not try further fallbacks when one returns a non-transport (definitive) error', async () => {
    const api = makeFakeApi('https://primary', async () => {
      calls++;
      if (api.endpointUrl === 'https://backup-1') throw new FakeChainApiError();
      // Would succeed if reached - proves the walk stopped at backup-1.
      if (api.endpointUrl === 'https://backup-2') return 'ok-from-backup-2';
      throw new FakeTransportError();
    });
    const chain = wrapChainWithRetry({ api, restApi: {} } as any, {
      api: ['https://backup-1', 'https://backup-2']
    });

    let caught: unknown;
    try {
      await chain.api.bridge.get_post();
    } catch (error) {
      caught = error;
    }

    expect(caught).to.be.instanceOf(FakeChainApiError);
    expect(api.endpointUrl).to.equal('https://backup-1');
  });

  it('walks a multi-endpoint fallback list in order until one succeeds', async () => {
    const api = makeFakeApi('https://primary', async () => {
      calls++;
      if (api.endpointUrl === 'https://backup-2') return 'ok-from-backup-2';
      throw new FakeTransportError();
    });
    const chain = wrapChainWithRetry({ api, restApi: {} } as any, {
      api: ['https://backup-1', 'https://backup-2']
    });

    const result = await chain.api.bridge.get_post();

    expect(result).to.equal('ok-from-backup-2');
    expect(api.endpointUrl).to.equal('https://backup-2');
  });

  it('never wraps network_broadcast_api with retry/failover', async () => {
    const api = makeFakeApi('https://primary', async () => {
      calls++;
      throw new FakeTransportError();
    });
    const chain = wrapChainWithRetry({ api, restApi: {} } as any, { api: ['https://backup'] });

    let caught: unknown;
    try {
      await chain.api.network_broadcast_api.broadcast_transaction();
    } catch (error) {
      caught = error;
    }

    expect(caught).to.be.instanceOf(FakeTransportError);
    expect(calls).to.equal(1);
    expect(api.endpointUrl).to.equal('https://primary');
  });
});

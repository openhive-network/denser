import { expect } from 'chai';
import {
  type ITransactionIdObserver,
  findNodeNetworkFailure,
  findWaxRequestTimeout,
  isNodeNetworkFailure,
  isWaxRequestTimeout,
  TransactionNotConfirmedError,
  toNotConfirmedError,
  watchInclusion
} from './transaction-inclusion';

/** A bot whose test drives `next`/`error` for the one transaction it is subscribed to. */
class FakeBot implements ITransactionIdObserver {
  subscribedIds: string[] = [];
  unsubscribes = 0;
  private observer: { next: () => void; error: (error: unknown) => void } | undefined;

  readonly observe = {
    onTransactionIds: (transactionId: string) => {
      this.subscribedIds.push(transactionId);
      return {
        subscribe: (observer: { next: () => void; error: (error: unknown) => void }) => {
          this.observer = observer;
          return { unsubscribe: () => this.unsubscribes++ };
        }
      };
    }
  };

  includeInBlock() {
    this.observer?.next();
  }

  failScan(error: unknown) {
    this.observer?.error(error);
  }
}

const SHORT_TIMEOUT_MS = 20;

describe('watchInclusion', () => {
  it('resolves true and unsubscribes when a block includes the transaction', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, 'abc123', SHORT_TIMEOUT_MS);
    bot.includeInBlock();

    expect(await watch.included).to.equal(true);
    expect(bot.subscribedIds).to.deep.equal(['abc123']);
    expect(bot.unsubscribes).to.equal(1);
  });

  it('resolves false and unsubscribes when no block includes it in time', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, 'abc123', SHORT_TIMEOUT_MS);

    expect(await watch.included).to.equal(false);
    expect(bot.unsubscribes).to.equal(1);
  });

  it('ignores a block reported after the timeout', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, 'abc123', SHORT_TIMEOUT_MS);
    const included = await watch.included;
    bot.includeInBlock();

    expect(included).to.equal(false);
    expect(bot.unsubscribes).to.equal(1);
  });

  it('resolves false at once when cancelled', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, 'abc123', 60_000);
    watch.cancel();
    bot.includeInBlock();

    expect(await watch.included).to.equal(false);
    expect(bot.unsubscribes).to.equal(1);
  });

  it("rejects with the bot's error when it cannot scan blocks", async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, 'abc123', 60_000);
    const failure = new Error('node unreachable');
    bot.failScan(failure);

    const error = await watch.included.then(
      () => undefined,
      (reason: unknown) => reason
    );
    expect(error).to.equal(failure);
    expect(bot.unsubscribes).to.equal(1);
  });

  it('settles from a bot that reports while subscribing', async () => {
    const bot: ITransactionIdObserver & { unsubscribes: number } = {
      unsubscribes: 0,
      observe: {
        onTransactionIds: () => ({
          subscribe: (observer) => {
            observer.next();
            return { unsubscribe: () => bot.unsubscribes++ };
          }
        })
      }
    };
    const watch = watchInclusion(bot, 'abc123', 60_000);

    expect(await watch.included).to.equal(true);
    expect(bot.unsubscribes).to.equal(1);
  });
});

describe('toNotConfirmedError', () => {
  // As WorkerBee 1.28.4 words it when its listener expires
  const LISTENER_EXPIRED =
    'Transaction #a2192469 (legacy: #a2192469) broadcasted successfully, but listener has expired.\n' +
    'Blocks analyzed: 111225633 - 111225635\n' +
    "Try adjusting the 'expireInMs' option (currently set to 10000 ms) in the broadcast method to a higher value.";

  it('turns the expired-listener rejection into a not-confirmed error keeping the original as cause', () => {
    const original = new Error(LISTENER_EXPIRED);
    const error = toNotConfirmedError(original, 'a2192469');

    if (!(error instanceof TransactionNotConfirmedError))
      return expect.fail('not a TransactionNotConfirmedError');
    expect(error.transactionId).to.equal('a2192469');
    expect(error.cause).to.equal(original);
    expect(error.message).to.not.include('expireInMs');
  });

  /**
   * What wax 1.28.8 throws for a request that times out: a `WaxRequestTimeoutError` its bundle names
   * `WaxError`, carrying the request options with the JSON-RPC payload as `data`.
   */
  function requestTimeout(method: string, { name = 'WaxError', dataAsString = false } = {}) {
    const payload = { jsonrpc: '2.0', method, params: {}, id: 1 };
    const error = Object.assign(new Error('Request timed out: "POST https://api.hive.blog"'), {
      request: {
        endpoint: 'https://api.hive.blog',
        url: '',
        method: 'POST',
        timeout: 2000,
        data: dataAsString ? JSON.stringify(payload) : payload
      }
    });
    error.name = name;
    return error;
  }

  const BROADCAST_TIMEOUTS = [
    { method: 'network_broadcast_api.broadcast_transaction', name: 'WaxError' },
    { method: 'network_broadcast_api.broadcast_transaction', name: 'WaxRequestTimeoutError' },
    { method: 'condenser_api.broadcast_transaction', name: 'WaxError' }
  ];
  for (const { method, name } of BROADCAST_TIMEOUTS) {
    it(`turns a timed-out ${method} request (${name}) into a not-confirmed error`, () => {
      const original = requestTimeout(method, { name });
      const error = toNotConfirmedError(original, 'a2192469');

      if (!(error instanceof TransactionNotConfirmedError))
        return expect.fail('not a TransactionNotConfirmedError');
      expect(error.transactionId).to.equal('a2192469');
      expect(error.cause).to.equal(original);
    });
  }

  it('reads the method from a request payload sent as a JSON string', () => {
    const original = requestTimeout('network_broadcast_api.broadcast_transaction', { dataAsString: true });

    expect(toNotConfirmedError(original, 'a2192469')).to.be.instanceOf(TransactionNotConfirmedError);
  });

  // Reads of WorkerBee's inclusion observer, which go on after `broadcast_transaction` succeeded
  for (const method of [
    'block_api.get_block',
    'block_api.get_block_range',
    'database_api.get_dynamic_global_properties'
  ]) {
    it(`turns a timed-out block scanner read (${method}) into a not-confirmed error`, () => {
      const original = requestTimeout(method);
      const error = toNotConfirmedError(original, 'a2192469');

      if (!(error instanceof TransactionNotConfirmedError))
        return expect.fail('not a TransactionNotConfirmedError');
      expect(error.transactionId).to.equal('a2192469');
      expect(error.cause).to.equal(original);
    });
  }

  // Reads wax's on-chain verification makes before sending the transaction
  for (const method of ['database_api.find_accounts', 'rc_api.find_rc_accounts']) {
    it(`passes a timed-out pre-broadcast verification read (${method}) through unchanged`, () => {
      const original = requestTimeout(method);

      expect(toNotConfirmedError(original, 'a2192469')).to.equal(original);
    });
  }

  it('reads a pre-broadcast verification method from a request payload sent as a JSON string', () => {
    const original = requestTimeout('database_api.find_accounts', { dataAsString: true });

    expect(toNotConfirmedError(original, 'a2192469')).to.equal(original);
  });

  it('turns a timeout without a readable request method into a not-confirmed error', () => {
    const noRequest = new Error('Request timed out: "POST https://api.hive.blog"');
    noRequest.name = 'WaxError';
    const garbled = Object.assign(new Error('Request timed out: "POST https://api.hive.blog"'), {
      request: { data: 'not json' }
    });
    garbled.name = 'WaxError';

    expect(toNotConfirmedError(noRequest, 'a2192469')).to.be.instanceOf(TransactionNotConfirmedError);
    expect(toNotConfirmedError(garbled, 'a2192469')).to.be.instanceOf(TransactionNotConfirmedError);
  });

  /**
   * What wax 1.28.8 throws for a request that fails on the network (connection reset or dropped, the
   * browser blocking it): a `WaxUnknownRequestError` its bundle can name `WaxError`.
   */
  function networkFailure(method: string, { name = 'WaxError', dataAsString = false } = {}) {
    const error = requestTimeout(method, { name, dataAsString });
    error.message = 'Unknown request error caught (possible network or CORS error): "POST https://api.hive.blog"';
    return error;
  }

  for (const { method, name } of [
    { method: 'network_broadcast_api.broadcast_transaction', name: 'WaxError' },
    { method: 'network_broadcast_api.broadcast_transaction', name: 'WaxUnknownRequestError' },
    { method: 'block_api.get_block', name: 'WaxError' },
    { method: 'block_api.get_block_range', name: 'WaxError' }
  ]) {
    it(`turns a ${method} request failed on the network (${name}) into a not-confirmed error`, () => {
      const original = networkFailure(method, { name });
      const error = toNotConfirmedError(original, 'a2192469');

      if (!(error instanceof TransactionNotConfirmedError))
        return expect.fail('not a TransactionNotConfirmedError');
      expect(error.transactionId).to.equal('a2192469');
      expect(error.cause).to.equal(original);
    });
  }

  for (const method of ['database_api.find_accounts', 'rc_api.find_rc_accounts']) {
    it(`passes a pre-broadcast verification read (${method}) failed on the network through unchanged`, () => {
      const original = networkFailure(method, { dataAsString: true });

      expect(toNotConfirmedError(original, 'a2192469')).to.equal(original);
    });
  }

  it('turns a network failure without a readable request method into a not-confirmed error', () => {
    const noRequest = new Error('Unknown request error caught (possible network or CORS error): "POST https://api.hive.blog"');
    noRequest.name = 'WaxError';

    expect(toNotConfirmedError(noRequest, 'a2192469')).to.be.instanceOf(TransactionNotConfirmedError);
  });

  it('passes other broadcast errors through unchanged', () => {
    const rejected = new Error('Assert Exception: payer has not enough RC mana for transaction');
    const notAnError = { message: LISTENER_EXPIRED };
    const otherTimeout = new Error('Request timed out: "POST https://api.hive.blog"');
    const otherNetworkFailure = new Error('Unknown request error caught (possible network or CORS error)');
    const expired = new Error('transaction expiration exception');
    expired.name = 'WaxUnhandledAssertionError';

    expect(toNotConfirmedError(rejected, 'a2192469')).to.equal(rejected);
    expect(toNotConfirmedError(notAnError, 'a2192469')).to.equal(notAnError);
    expect(toNotConfirmedError(otherTimeout, 'a2192469')).to.equal(otherTimeout);
    expect(toNotConfirmedError(otherNetworkFailure, 'a2192469')).to.equal(otherNetworkFailure);
    expect(toNotConfirmedError(expired, 'a2192469')).to.equal(expired);
  });
});

describe('isWaxRequestTimeout', () => {
  it("takes wax's request timeout under either of its names", () => {
    for (const name of ['WaxError', 'WaxRequestTimeoutError']) {
      const error = new Error('Request timed out: "POST https://api.hive.blog"');
      error.name = name;
      expect(isWaxRequestTimeout(error)).to.equal(true);
    }
  });

  it('rejects other errors and timeouts not raised by wax', () => {
    const notWax = new Error('Request timed out: "POST https://api.hive.blog"');
    const otherWax = new Error('Chain API returned an error');
    otherWax.name = 'WaxChainApiError';

    expect(isWaxRequestTimeout(notWax)).to.equal(false);
    expect(isWaxRequestTimeout(otherWax)).to.equal(false);
    expect(isWaxRequestTimeout({ name: 'WaxError', message: 'Request timed out' })).to.equal(false);
  });
});

describe('findWaxRequestTimeout', () => {
  const waxTimeout = () => {
    const error = new Error('Request timed out: "POST https://api.hive.blog"');
    error.name = 'WaxError';
    return error;
  };

  it("finds wax's request timeout itself", () => {
    const timeout = waxTimeout();
    expect(findWaxRequestTimeout(timeout)).to.equal(timeout);
  });

  it('finds it as the cause of the error the safe-storage unlock rethrows', () => {
    const timeout = waxTimeout();
    const unlockError = new Error(timeout.message, { cause: timeout });

    expect(findWaxRequestTimeout(unlockError)).to.equal(timeout);
    expect(findWaxRequestTimeout(new Error('Signing failed', { cause: unlockError }))).to.equal(timeout);
  });

  it('finds nothing in an unlock failure that is no timeout', () => {
    const invalidCredentials = new Error('Invalid credentials');
    invalidCredentials.name = 'AuthorizationError';
    const notWaxTimeout = new Error('Request timed out: "POST https://api.hive.blog"');

    expect(findWaxRequestTimeout(new Error('Invalid credentials', { cause: invalidCredentials }))).to.equal(undefined);
    expect(findWaxRequestTimeout(new Error(notWaxTimeout.message, { cause: notWaxTimeout }))).to.equal(undefined);
    expect(findWaxRequestTimeout(new Error('No password to unlock key'))).to.equal(undefined);
    expect(findWaxRequestTimeout(undefined)).to.equal(undefined);
  });
});

describe('isNodeNetworkFailure', () => {
  const MESSAGE = 'Unknown request error caught (possible network or CORS error): "POST https://api.hive.blog"';

  it("takes wax's and the read client's network failure under any of their names", () => {
    for (const name of ['WaxError', 'WaxUnknownRequestError', 'ReadTransportError']) {
      const error = new Error(MESSAGE);
      error.name = name;
      expect(isNodeNetworkFailure(error)).to.equal(true);
    }
  });

  it('rejects other node errors and network failures not raised for a node request', () => {
    const notWax = new Error(MESSAGE);
    const timeout = new Error('Request timed out: "POST https://api.hive.blog"');
    timeout.name = 'WaxError';

    expect(isNodeNetworkFailure(notWax)).to.equal(false);
    expect(isNodeNetworkFailure(timeout)).to.equal(false);
    expect(isNodeNetworkFailure({ name: 'WaxError', message: MESSAGE })).to.equal(false);
  });
});

describe('findNodeNetworkFailure', () => {
  const networkFailure = () => {
    const error = new Error('Unknown request error caught (possible network or CORS error): "POST https://api.hive.blog"');
    error.name = 'WaxError';
    return error;
  };

  it('finds the network failure itself or as the cause the safe-storage unlock rethrows', () => {
    const failure = networkFailure();
    const unlockError = new Error(failure.message, { cause: failure });

    expect(findNodeNetworkFailure(failure)).to.equal(failure);
    expect(findNodeNetworkFailure(new Error('Signing failed', { cause: unlockError }))).to.equal(failure);
  });

  it('finds nothing in a timeout or another failure', () => {
    const timeout = new Error('Request timed out: "POST https://api.hive.blog"');
    timeout.name = 'WaxError';

    expect(findNodeNetworkFailure(timeout)).to.equal(undefined);
    expect(findNodeNetworkFailure(new Error('Invalid credentials'))).to.equal(undefined);
    expect(findNodeNetworkFailure(undefined)).to.equal(undefined);
  });
});

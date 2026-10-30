import { expect } from 'chai';
import {
  type ITransactionIdObserver,
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

    if (!(error instanceof TransactionNotConfirmedError)) return expect.fail('not a TransactionNotConfirmedError');
    expect(error.transactionId).to.equal('a2192469');
    expect(error.cause).to.equal(original);
    expect(error.message).to.not.include('expireInMs');
  });

  it('passes other broadcast errors through unchanged', () => {
    const rejected = new Error('Assert Exception: payer has not enough RC mana for transaction');
    const notAnError = { message: LISTENER_EXPIRED };

    expect(toNotConfirmedError(rejected, 'a2192469')).to.equal(rejected);
    expect(toNotConfirmedError(notAnError, 'a2192469')).to.equal(notAnError);
  });
});

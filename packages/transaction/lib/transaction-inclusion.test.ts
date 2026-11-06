import { expect } from 'chai';
import {
  type InclusionLookup,
  type IScannedBlock,
  type ITransactionIdObserver,
  findNodeNetworkFailure,
  findWaxRequestTimeout,
  inclusionLookupVia,
  isNodeNetworkFailure,
  isWaxRequestTimeout,
  recordedTransactionId,
  TransactionNotConfirmedError,
  toNotConfirmedError,
  toObservedBroadcastError,
  watchInclusion
} from './transaction-inclusion';

/** A bot whose test drives `next`/`error` for the transactions it is subscribed to. */
class FakeBot implements ITransactionIdObserver {
  subscribedIds: string[][] = [];
  unsubscribes = 0;
  private observer: { next: (block: IScannedBlock) => void; error: (error: unknown) => void } | undefined;

  readonly observe = {
    onTransactionIds: (...transactionIds: string[]) => {
      this.subscribedIds.push(transactionIds);
      return {
        onBlock: () => ({
          subscribe: (observer: { next: (block: IScannedBlock) => void; error: (error: unknown) => void }) => {
            this.observer = observer;
            return { unsubscribe: () => this.unsubscribes++ };
          }
        })
      };
    }
  };

  scanBlock(...includedIds: string[]) {
    this.observer?.next({ transactions: Object.fromEntries(includedIds.map((id) => [id, { signatures: [] }])) });
  }

  failScan(error: unknown) {
    this.observer?.error(error);
  }
}

const SHORT_TIMEOUT_MS = 20;
const IDS = ['abc123', 'legacy456'];

describe('watchInclusion', () => {
  it('resolves true and unsubscribes when a block includes the transaction', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, IDS, SHORT_TIMEOUT_MS);
    bot.scanBlock('abc123');

    expect(await watch.included).to.equal(true);
    expect(bot.subscribedIds).to.deep.equal([IDS]);
    expect(bot.unsubscribes).to.equal(1);
  });

  it('resolves true when the block lists the transaction under its legacy id', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, IDS, 60_000);
    bot.scanBlock('legacy456');

    expect(await watch.included).to.equal(true);
    expect(bot.unsubscribes).to.equal(1);
  });

  it('keeps watching after a scanner error and resolves true on a later block with the transaction', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, IDS, 60_000);
    bot.scanBlock();
    bot.failScan(new Error('node unreachable'));
    await Promise.resolve();
    expect(bot.unsubscribes).to.equal(0);
    bot.scanBlock('abc123');

    expect(await watch.included).to.equal(true);
    expect(bot.unsubscribes).to.equal(1);
  });

  it('resolves true after scanner errors before any block was scanned', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, IDS, 60_000);
    bot.failScan(new Error('node unreachable'));
    bot.scanBlock('legacy456');

    expect(await watch.included).to.equal(true);
  });

  it('ignores a block that includes other transactions only', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, IDS, SHORT_TIMEOUT_MS);
    bot.scanBlock('someone-else');

    expect(await watch.included).to.equal(false);
  });

  it('resolves false and unsubscribes when the blocks scanned in time do not include it', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, IDS, SHORT_TIMEOUT_MS);
    bot.scanBlock();
    bot.failScan(new Error('node unreachable'));

    expect(await watch.included).to.equal(false);
    expect(bot.unsubscribes).to.equal(1);
  });

  it('ignores a block reported after the timeout', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, IDS, SHORT_TIMEOUT_MS);
    bot.scanBlock();
    const included = await watch.included;
    bot.scanBlock('abc123');

    expect(included).to.equal(false);
    expect(bot.unsubscribes).to.equal(1);
  });

  it('resolves false at once when cancelled', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, IDS, 60_000);
    watch.cancel();
    bot.scanBlock('abc123');

    expect(await watch.included).to.equal(false);
    expect(bot.unsubscribes).to.equal(1);
  });

  it("rejects at the timeout with the bot's last error as cause when no block was scanned", async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, IDS, SHORT_TIMEOUT_MS);
    const failure = new Error('node unreachable');
    bot.failScan(new Error('first failure'));
    bot.failScan(failure);

    const error = await watch.included.then(
      () => undefined,
      (reason: unknown) => reason
    );
    expect(error).to.be.instanceOf(Error).and.to.have.property('cause', failure);
    expect(bot.unsubscribes).to.equal(1);
  });

  it('rejects at the timeout when the bot neither scanned a block nor failed', async () => {
    const bot = new FakeBot();
    const watch = watchInclusion(bot, IDS, SHORT_TIMEOUT_MS);

    const error = await watch.included.then(
      () => undefined,
      (reason: unknown) => reason
    );
    expect(error).to.be.instanceOf(Error).and.to.have.property('cause', undefined);
  });

  it('settles from a bot that reports while subscribing', async () => {
    const bot: ITransactionIdObserver & { unsubscribes: number } = {
      unsubscribes: 0,
      observe: {
        onTransactionIds: () => ({
          onBlock: () => ({
            subscribe: (observer) => {
              observer.next({ transactions: { abc123: {} } });
              return { unsubscribe: () => bot.unsubscribes++ };
            }
          })
        })
      }
    };
    const watch = watchInclusion(bot, IDS, 60_000);

    expect(await watch.included).to.equal(true);
    expect(bot.unsubscribes).to.equal(1);
  });
});

describe('watchInclusion after a scanner error', () => {
  const lookUp = (answer: Promise<boolean>) => {
    const asked: (readonly string[])[] = [];
    return {
      asked,
      lookUpInclusion: (transactionIds: readonly string[]) => {
        asked.push(transactionIds);
        return answer;
      }
    };
  };

  it("resolves the lookup's true at the timeout when the blocks scanned did not include it", async () => {
    const bot = new FakeBot();
    const { asked, lookUpInclusion } = lookUp(Promise.resolve(true));
    const watch = watchInclusion(bot, IDS, SHORT_TIMEOUT_MS, lookUpInclusion);
    bot.failScan(new Error('node unreachable'));
    bot.scanBlock();

    expect(await watch.included).to.equal(true);
    expect(asked).to.deep.equal([IDS]);
    expect(bot.unsubscribes).to.equal(1);
  });

  it("resolves the lookup's false, for a transaction that never landed", async () => {
    const bot = new FakeBot();
    const { lookUpInclusion } = lookUp(Promise.resolve(false));
    const watch = watchInclusion(bot, IDS, SHORT_TIMEOUT_MS, lookUpInclusion);
    bot.scanBlock();
    bot.failScan(new Error('node unreachable'));

    expect(await watch.included).to.equal(false);
  });

  it('rejects with the failure as cause when the lookup fails', async () => {
    const bot = new FakeBot();
    const failure = new Error('node unreachable');
    const { lookUpInclusion } = lookUp(Promise.reject(failure));
    const watch = watchInclusion(bot, IDS, SHORT_TIMEOUT_MS, lookUpInclusion);
    bot.scanBlock();
    bot.failScan(new Error('scanner failed'));

    const error = await watch.included.then(
      () => undefined,
      (reason: unknown) => reason
    );
    expect(error).to.be.instanceOf(Error).and.to.have.property('cause', failure);
    expect(bot.unsubscribes).to.equal(1);
  });

  it('resolves true from a block the bot reports while the lookup is pending', async () => {
    const bot = new FakeBot();
    const { asked, lookUpInclusion } = lookUp(new Promise<boolean>(() => {}));
    const watch = watchInclusion(bot, IDS, SHORT_TIMEOUT_MS, lookUpInclusion);
    bot.failScan(new Error('node unreachable'));
    await new Promise((resolve) => setTimeout(resolve, SHORT_TIMEOUT_MS * 2));
    expect(asked).to.have.length(1);
    bot.scanBlock('legacy456');

    expect(await watch.included).to.equal(true);
  });

  it('does not look up the transaction when no scanner error occurred', async () => {
    const bot = new FakeBot();
    const { asked, lookUpInclusion } = lookUp(Promise.resolve(true));
    const watch = watchInclusion(bot, IDS, SHORT_TIMEOUT_MS, lookUpInclusion);
    bot.scanBlock();

    expect(await watch.included).to.equal(false);
    expect(asked).to.deep.equal([]);
  });
});

describe('inclusionLookupVia', () => {
  const answering =
    (statuses: Partial<Record<string, string | Error>>) =>
    async ({ transaction_id }: { transaction_id: string }) => {
      const answer = statuses[transaction_id] ?? 'unknown';
      if (answer instanceof Error) throw answer;
      return { status: answer };
    };

  it('finds a transaction in a reversible or irreversible block under either id', async () => {
    expect(await inclusionLookupVia(answering({ abc123: 'within_reversible_block' }))(IDS)).to.equal(true);
    expect(await inclusionLookupVia(answering({ legacy456: 'within_irreversible_block' }))(IDS)).to.equal(true);
  });

  it('finds no transaction the node does not know or holds in its mempool only', async () => {
    expect(await inclusionLookupVia(answering({ abc123: 'within_mempool' }))(IDS)).to.equal(false);
    expect(await inclusionLookupVia(answering({ abc123: 'expired_irreversible' }))(IDS)).to.equal(false);
  });

  it('asks once for a transaction whose ids are the same', async () => {
    const asked: string[] = [];
    const lookUpInclusion = inclusionLookupVia(async ({ transaction_id }) => {
      asked.push(transaction_id);
      return { status: 'unknown' };
    });

    expect(await lookUpInclusion(['abc123', 'abc123'])).to.equal(false);
    expect(asked).to.deep.equal(['abc123']);
  });

  it('rejects when a request failed and no id was found, else answers from the other id', async () => {
    const failure = new Error('node unreachable');

    const error = await inclusionLookupVia(answering({ abc123: failure }))(IDS).then(
      () => undefined,
      (reason: unknown) => reason
    );
    expect(error).to.equal(failure);
    expect(
      await inclusionLookupVia(answering({ abc123: failure, legacy456: 'within_reversible_block' }))(IDS)
    ).to.equal(true);
  });
});

interface IWaxTransaction {
  pushOperation(operation: object): IWaxTransaction;
  readonly id: string;
  readonly legacy_id: string;
}
interface IWaxModule {
  createWaxFoundation(): Promise<{ createTransactionWithTaPoS(taposBlockId: string): IWaxTransaction }>;
}

const importEsm = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<unknown>;

describe('recordedTransactionId', function () {
  let transaction: IWaxTransaction;

  before(async function () {
    this.timeout(30_000);
    const wax = await ((await importEsm('@hiveio/wax')) as IWaxModule).createWaxFoundation();
    // A reply with comment rewards Power Up: `comment_options` serializes an asset, so the ids differ
    transaction = wax
      .createTransactionWithTaPoS('04c1c7a566fc0da66aee465714acee7346b48ac2')
      .pushOperation({
        comment_operation: {
          parent_author: 'bob',
          parent_permlink: 'a-post',
          author: 'alice',
          permlink: 're-a-post',
          title: '',
          body: 'Reply',
          json_metadata: '{}'
        }
      })
      .pushOperation({
        comment_options_operation: {
          author: 'alice',
          permlink: 're-a-post',
          max_accepted_payout: { amount: '1000000000', precision: 3, nai: '@@000000013' },
          percent_hbd: 0,
          allow_votes: true,
          allow_curation_rewards: true,
          extensions: []
        }
      });
  });

  it('takes the legacy id for a transaction signed in the legacy serialization (Keychain, PeakVault)', () => {
    expect(transaction.legacy_id).to.not.equal(transaction.id);
    expect(recordedTransactionId(transaction, 'legacy')).to.equal(transaction.legacy_id);
  });

  it('takes the HF26 id for a transaction signed in the HF26 serialization', () => {
    expect(recordedTransactionId(transaction, 'hf26')).to.equal(transaction.id);
  });
});

/**
 * A node a real WorkerBee bot polls: the head and the transaction ids of each block are the test's,
 * and so are the block reads that fail.
 */
class FakeNode {
  head = 100;
  readonly transactionIdsOf = new Map<number, string[]>();
  readonly failingBlockReads = new Set<number>();
  readonly blockReads: string[] = [];
  /** What `broadcast_transaction` answers; pending by default, a request still in flight. */
  broadcastAnswer: Promise<void> = new Promise(() => {});

  private block(blockNum: number) {
    const transactionIds = this.transactionIdsOf.get(blockNum) ?? [];
    return { transaction_ids: transactionIds, transactions: transactionIds.map(() => ({ operations: [] })) };
  }

  readonly chain: object = {
    extend: () => this.chain,
    createTransactionFromJson: (transaction: object) => ({ transaction }),
    broadcast: () => this.broadcastAnswer,
    api: {
      database_api: {
        get_dynamic_global_properties: async () => ({
          head_block_number: this.head,
          head_block_id: `${this.head}`,
          current_witness: 'witness',
          time: '2026-11-06T00:00:00',
          downvote_pool_percent: 2500
        })
      },
      block_api: {
        get_block: async ({ block_num }: { block_num: number }) => {
          this.blockReads.push(`get_block ${block_num}`);
          if (this.failingBlockReads.delete(block_num)) throw new Error('Request timed out');
          return { block: this.block(block_num) };
        },
        get_block_range: async ({ starting_block_num, count }: { starting_block_num: number; count: number }) => {
          this.blockReads.push(`get_block_range ${starting_block_num}+${count}`);
          return { blocks: Array.from({ length: count }, (_, i) => this.block(starting_block_num + i)) };
        }
      }
    }
  };
}

interface IWorkerBeeBot extends ITransactionIdObserver {
  /** Not in WorkerBee's types: the mediator whose `notify` is one poll of `start()`'s interval. */
  mediator: { notify(): Promise<void> };
  broadcast(transaction: { signatures: string[] }, options?: { expireInMs?: number }): Promise<void>;
  delete(): void;
}

interface IWorkerBeeModule {
  default: new (chain: object) => IWorkerBeeBot;
  WorkerBeeError: new (message: string) => Error;
}

describe("watchInclusion on WorkerBee's block collector", function () {
  let createBot: (chain: object) => IWorkerBeeBot;

  before(async function () {
    this.timeout(30_000);
    const workerBee = (await importEsm('@hiveio/workerbee')) as IWorkerBeeModule;
    createBot = (chain) => new workerBee.default(chain);
  });

  const WATCH_MS = 200;
  const TX_ID = 'abc123';

  /** One poll of `bot`, with the block reads and observers it starts settled. */
  const poll = async (bot: IWorkerBeeBot) => {
    await bot.mediator.notify();
    await new Promise((resolve) => setTimeout(resolve, 10));
  };

  const watchOnFreshBotWithFailedFirstRead = async (node: FakeNode, lookUpInclusion?: InclusionLookup) => {
    const bot = createBot(node.chain);
    const watch = watchInclusion(bot, [TX_ID], WATCH_MS, lookUpInclusion);
    node.failingBlockReads.add(100);
    await poll(bot);
    node.head = 101;
    await poll(bot);
    return { bot, watch };
  };

  it('never scans the block whose read failed first on a fresh bot', async () => {
    const node = new FakeNode();
    node.transactionIdsOf.set(100, [TX_ID]);
    const { bot, watch } = await watchOnFreshBotWithFailedFirstRead(node);

    expect(node.blockReads).to.deep.equal(['get_block 100', 'get_block 101']);
    expect(await watch.included).to.equal(false);
    bot.delete();
  });

  it('confirms a transaction in that block through the lookup', async () => {
    const node = new FakeNode();
    node.transactionIdsOf.set(100, [TX_ID]);
    const lookUpInclusion = inclusionLookupVia(async () => ({ status: 'within_reversible_block' }));
    const { bot, watch } = await watchOnFreshBotWithFailedFirstRead(node, lookUpInclusion);

    expect(await watch.included).to.equal(true);
    bot.delete();
  });

  it('confirms a transaction in the head block a catch-up read stopped short of', async () => {
    const node = new FakeNode();
    node.transactionIdsOf.set(102, [TX_ID]);
    const bot = createBot(node.chain);
    const watch = watchInclusion(
      bot,
      [TX_ID],
      WATCH_MS,
      inclusionLookupVia(async () => ({ status: 'within_reversible_block' }))
    );
    await poll(bot);
    node.head = 101;
    node.failingBlockReads.add(101);
    await poll(bot);
    node.head = 102;
    await poll(bot);

    expect(node.blockReads).to.deep.equal(['get_block 100', 'get_block 101', 'get_block_range 101+1']);
    expect(await watch.included).to.equal(true);
    bot.delete();
  });

  it('reports a transaction that never landed as not included', async () => {
    const node = new FakeNode();
    const { bot, watch } = await watchOnFreshBotWithFailedFirstRead(
      node,
      inclusionLookupVia(async () => ({ status: 'unknown' }))
    );

    expect(await watch.included).to.equal(false);
    bot.delete();
  });
});

describe("toObservedBroadcastError on WorkerBee's broadcast", function () {
  let createBot: (chain: object) => IWorkerBeeBot;
  let isWorkerBeeError: (error: unknown) => boolean;

  before(async function () {
    this.timeout(30_000);
    const workerBee = (await importEsm('@hiveio/workerbee')) as IWorkerBeeModule;
    createBot = (chain) => new workerBee.default(chain);
    isWorkerBeeError = (error) => error instanceof workerBee.WorkerBeeError;
  });

  const TX_ID = 'abc123';
  const SIGNED_TRANSACTION = { signatures: ['1f00'] };

  const poll = async (bot: IWorkerBeeBot) => {
    await bot.mediator.notify();
    await new Promise((resolve) => setTimeout(resolve, 10));
  };

  /** The error `bot.broadcast` rejects with, given the polls `drive` makes while it is pending. */
  const broadcastRejection = async (bot: IWorkerBeeBot, drive: () => Promise<void>) => {
    const rejection = bot.broadcast(SIGNED_TRANSACTION, { expireInMs: 60_000 }).then(
      () => expect.fail('the broadcast resolved'),
      (error: unknown) => error
    );
    await drive();
    return await rejection;
  };

  it("turns the block scanner's WorkerBee error, the broadcast still in flight, into a not-confirmed error", async () => {
    const node = new FakeNode();
    const bot = createBot(node.chain);
    const caught = await broadcastRejection(bot, async () => {
      await poll(bot);
      // A gap WorkerBee refuses to catch up on, failing the scanner with its own error
      node.head = 2_000;
      await poll(bot);
    });

    expect(isWorkerBeeError(caught)).to.equal(true);
    const error = toObservedBroadcastError(caught, TX_ID, isWorkerBeeError);
    if (!(error instanceof TransactionNotConfirmedError))
      return expect.fail('not a TransactionNotConfirmedError');
    expect(error.transactionId).to.equal(TX_ID);
    expect(error.cause).to.equal(caught);
    bot.delete();
  });

  it('passes the node\'s rejection of the broadcast through unchanged', async () => {
    const node = new FakeNode();
    const rejected = new Error('Assert Exception: missing required active authority');
    node.broadcastAnswer = Promise.reject(rejected);
    const bot = createBot(node.chain);
    const caught = await broadcastRejection(bot, () => poll(bot));

    expect(toObservedBroadcastError(caught, TX_ID, isWorkerBeeError)).to.equal(rejected);
    bot.delete();
  });

  it('turns a network failure of the broadcast request into a not-confirmed error as toNotConfirmedError does', () => {
    const failure = new Error('Unknown request error caught (possible network or CORS error)');
    failure.name = 'WaxError';

    expect(toObservedBroadcastError(failure, TX_ID, isWorkerBeeError)).to.be.instanceOf(TransactionNotConfirmedError);
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

  /** What webpack's and Turbopack's runtimes throw for a script chunk that could not be loaded. */
  function chunkLoadError() {
    const error = new Error('Loading chunk 8123 failed.\n(error: https://blog.example/_next/static/chunks/8123.js)');
    error.name = 'ChunkLoadError';
    return error;
  }

  // The failover chain loads `wax-errors` on a read's first failure, maybe a block scanner read made
  // after `broadcast_transaction` succeeded; WorkerBee's `broadcast` rejects with the scanner's error
  it('turns a chunk load failure during the broadcast into a not-confirmed error with the transaction id', () => {
    const original = chunkLoadError();
    const error = toNotConfirmedError(original, 'a2192469');

    if (!(error instanceof TransactionNotConfirmedError))
      return expect.fail('not a TransactionNotConfirmedError');
    expect(error.transactionId).to.equal('a2192469');
    expect(error.cause).to.equal(original);
  });

  it('finds a chunk load failure as the cause of the broadcast error', () => {
    const wrapped = new Error('Read failed', { cause: chunkLoadError() });

    expect(toNotConfirmedError(wrapped, 'a2192469')).to.be.instanceOf(TransactionNotConfirmedError);
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

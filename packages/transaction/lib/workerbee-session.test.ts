import { expect } from 'chai';
import { type ISessionBot, WORKERBEE_IDLE_TIMEOUT_MS, WorkerBeeSession } from './workerbee-session';

interface IFakeChain {
  name: string;
}

class FakeBot implements ISessionBot {
  running = false;
  starts = 0;
  stops = 0;
  deleted = false;
  readonly chain: IFakeChain;

  constructor(chain: IFakeChain) {
    this.chain = chain;
  }

  start() {
    this.running = true;
    this.starts++;
  }

  stop() {
    this.running = false;
    this.stops++;
  }

  delete() {
    this.deleted = true;
  }
}

/** A session on fake bots and a manual clock: `elapse` runs the timers due by then. */
const createSession = (initialChain: IFakeChain = { name: 'first' }) => {
  let chain = initialChain;
  let now = 0;
  let timers: Array<{ at: number; callback: () => void }> = [];
  const bots: FakeBot[] = [];
  const session = new WorkerBeeSession<IFakeChain, FakeBot>({
    getChain: async () => chain,
    createBot: (botChain) => {
      const bot = new FakeBot(botChain);
      bots.push(bot);
      return bot;
    },
    schedule: (callback, ms) => {
      const timer = { at: now + ms, callback };
      timers.push(timer);
      return () => {
        timers = timers.filter((other) => other !== timer);
      };
    }
  });
  const elapse = (ms: number) => {
    now += ms;
    const due = timers.filter((timer) => timer.at <= now);
    timers = timers.filter((timer) => timer.at > now);
    due.forEach((timer) => timer.callback());
  };
  const setChain = (next: IFakeChain) => {
    chain = next;
  };
  return { session, bots, elapse, setChain };
};

const deferred = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const flushPromises = () => new Promise<void>((done) => setImmediate(done));

describe('WorkerBeeSession', () => {
  it('runs the task with a started bot and returns its result', async () => {
    const { session, bots } = createSession();

    const result = await session.use(async (bot) => {
      expect(bot.running).to.equal(true);
      return 'tx-id';
    });

    expect(result).to.equal('tx-id');
    expect(bots).to.have.length(1);
  });

  it('reuses one running bot for sequential uses within the idle timeout', async () => {
    const { session, bots, elapse } = createSession();

    await session.use(async () => undefined);
    elapse(WORKERBEE_IDLE_TIMEOUT_MS - 1);
    await session.use(async () => undefined);
    elapse(WORKERBEE_IDLE_TIMEOUT_MS - 1);
    await session.use(async () => undefined);

    expect(bots).to.have.length(1);
    expect(bots[0].starts).to.equal(1);
    expect(bots[0].stops).to.equal(0);
  });

  it('stops and deletes the bot after the idle timeout, then creates a new one', async () => {
    const { session, bots, elapse } = createSession();

    await session.use(async () => undefined);
    elapse(WORKERBEE_IDLE_TIMEOUT_MS);

    expect(bots[0].stops).to.equal(1);
    expect(bots[0].deleted).to.equal(true);

    await session.use(async () => undefined);
    expect(bots).to.have.length(2);
    expect(bots[1].running).to.equal(true);
  });

  it('shares the bot between concurrent uses and idles only after the last finishes', async () => {
    const { session, bots, elapse } = createSession();
    const first = deferred();
    const second = deferred();

    const firstUse = session.use(() => first.promise);
    const secondUse = session.use(() => second.promise);
    await flushPromises();
    first.resolve();
    await firstUse;
    elapse(WORKERBEE_IDLE_TIMEOUT_MS * 2);

    expect(bots).to.have.length(1);
    expect(bots[0].running).to.equal(true);

    second.resolve();
    await secondUse;
    elapse(WORKERBEE_IDLE_TIMEOUT_MS);
    expect(bots[0].deleted).to.equal(true);
  });

  it('keeps the bot for the next use after a task fails, and rethrows the failure', async () => {
    const { session, bots } = createSession();
    const failure = new Error('missing authority');

    const outcome = await session.use(() => Promise.reject(failure)).catch((error: unknown) => error);
    await session.use(async () => undefined);

    expect(outcome).to.equal(failure);
    expect(bots).to.have.length(1);
  });

  it('starts a bot again when it stopped on its own', async () => {
    const { session, bots } = createSession();

    await session.use(async () => undefined);
    bots[0].stop();
    await session.use(async (bot) => {
      expect(bot.running).to.equal(true);
    });

    expect(bots).to.have.length(1);
    expect(bots[0].starts).to.equal(2);
  });

  it('moves to a bot on the new chain after a reset, deleting the old one once its tasks finish', async () => {
    const { session, bots, setChain } = createSession();
    const inFlight = deferred();

    const oldUse = session.use(() => inFlight.promise);
    await flushPromises();
    const reset = { name: 'second' };
    setChain(reset);
    await session.use(async (bot) => {
      expect(bot.chain).to.equal(reset);
    });

    expect(bots).to.have.length(2);
    expect(bots[0].deleted).to.equal(false);

    inFlight.resolve();
    await oldUse;
    expect(bots[0].deleted).to.equal(true);
    expect(bots[1].deleted).to.equal(false);
  });
});

import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

export const WORKERBEE_IDLE_TIMEOUT_MS = 60_000;

/** The lifecycle part of a WorkerBee bot the session drives. */
export interface ISessionBot {
  readonly running: boolean;
  start(): void;
  stop(): void;
  delete(): void;
}

export interface IWorkerBeeSessionOptions<TChain, TBot extends ISessionBot> {
  /** The chain bots are built on; a different instance than last time means the connection was reset. */
  getChain: () => Promise<TChain>;
  createBot: (chain: TChain) => TBot;
  idleTimeoutMs?: number;
  /** Calls `callback` after `ms`; returns a function cancelling the call. */
  schedule?: (callback: () => void, ms: number) => () => void;
}

const scheduleWithTimeout = (callback: () => void, ms: number): (() => void) => {
  const timer = setTimeout(callback, ms);
  return () => clearTimeout(timer);
};

interface ISessionEntry<TChain, TBot> {
  bot: TBot;
  chain: TChain;
  users: number;
}

/**
 * One WorkerBee bot shared by every observed broadcast. The bot is created and started on the
 * first `use`, kept running while any task uses it and for `idleTimeoutMs` after the last one
 * finishes, then stopped and deleted. A bot that stopped is started again on the next `use`; when
 * the chain was reset (node failover, WASM recovery) the next `use` gets a bot on the new chain,
 * and the old bot is deleted as soon as the tasks still running on it finish.
 */
export class WorkerBeeSession<TChain, TBot extends ISessionBot> {
  private current: ISessionEntry<TChain, TBot> | undefined;
  private cancelIdleTimer: (() => void) | undefined;
  private readonly idleTimeoutMs: number;
  private readonly schedule: (callback: () => void, ms: number) => () => void;
  private readonly options: IWorkerBeeSessionOptions<TChain, TBot>;

  constructor(options: IWorkerBeeSessionOptions<TChain, TBot>) {
    this.options = options;
    this.idleTimeoutMs = options.idleTimeoutMs ?? WORKERBEE_IDLE_TIMEOUT_MS;
    this.schedule = options.schedule ?? scheduleWithTimeout;
  }

  /** Runs `task` with a started bot and resolves or rejects with its result. */
  async use<T>(task: (bot: TBot) => Promise<T>): Promise<T> {
    const entry = await this.acquire();
    try {
      return await task(entry.bot);
    } finally {
      this.release(entry);
    }
  }

  /** Stops using the current bot: deletes it now when idle, else once its tasks finish. */
  private retireCurrent(): void {
    this.cancelIdleStop();
    const entry = this.current;
    this.current = undefined;
    if (entry && entry.users === 0) this.destroy(entry);
  }

  private async acquire(): Promise<ISessionEntry<TChain, TBot>> {
    const chain = await this.options.getChain();
    this.cancelIdleStop();
    if (this.current && this.current.chain !== chain) {
      logger.info('Chain changed, replacing bot');
      this.retireCurrent();
    }
    if (!this.current) {
      logger.info('Creating bot');
      this.current = { bot: this.options.createBot(chain), chain, users: 0 };
    }
    const entry = this.current;
    if (!entry.bot.running) {
      logger.info('Starting bot');
      entry.bot.start();
    }
    entry.users++;
    return entry;
  }

  private release(entry: ISessionEntry<TChain, TBot>): void {
    if (--entry.users > 0) return;
    if (entry !== this.current) {
      this.destroy(entry);
      return;
    }
    this.cancelIdleTimer = this.schedule(() => {
      this.cancelIdleTimer = undefined;
      if (this.current === entry && entry.users === 0) this.retireCurrent();
    }, this.idleTimeoutMs);
  }

  private cancelIdleStop(): void {
    this.cancelIdleTimer?.();
    this.cancelIdleTimer = undefined;
  }

  private destroy(entry: ISessionEntry<TChain, TBot>): void {
    logger.info('Stopping and destroying bot');
    entry.bot.stop();
    entry.bot.delete();
  }
}

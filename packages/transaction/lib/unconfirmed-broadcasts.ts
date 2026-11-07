import type { InclusionLookup } from './transaction-inclusion';

// A block whose timestamp is the expiration's second can still include the transaction; it arrives about
// a block interval later.
const BLOCK_INTERVAL_MS = 3_000;

/** How often a broadcast that may still apply is looked up, until a block includes it or it expires. */
const SETTLE_POLL_INTERVAL_MS = 20_000;

/** A broadcast that may still apply: sent, but not seen in a block before an answer was due. */
export interface IUnconfirmedBroadcast {
  /** The id the user is shown, the one a block lists for it. */
  transactionId: string;
  /** Its HF26 and legacy ids, to look it up by. */
  transactionIds: readonly string[];
  /** Its operations, serialized: a resend of the same operations serializes the same. */
  operations: string;
  /** Past this, no block can include it. */
  expiration: Date;
}

/** `may_still_apply` until the earlier transaction's expiration; `applied` once a block was found to include it. */
export type EarlierBroadcastState = 'may_still_apply' | 'applied';

/**
 * Refuses, before anything is signed, a transaction with the same operations as an earlier broadcast that
 * may still apply (`may_still_apply`, until `expiration`) or turned out applied (`applied`): sending it
 * could apply the operations twice. After `applied`, the same operations are sent when submitted again.
 */
export class EarlierBroadcastPendingError extends Error {
  constructor(
    readonly transactionId: string,
    readonly state: EarlierBroadcastState,
    readonly expiration: Date,
    cause?: unknown
  ) {
    const outcome = state === 'applied' ? 'applied' : 'may still apply';
    super(`An identical transaction ${transactionId} was sent earlier and ${outcome}`, { cause });
    this.name = 'EarlierBroadcastPendingError';
  }
}

/**
 * How a broadcast that may still apply settled: `applied` once a block was found to include it, `expired`
 * when the node answered that none did after its expiration, `unknown` when the lookup at the expiration
 * failed.
 */
export type BroadcastSettlement = 'applied' | 'expired' | 'unknown';

/** With `unknown`, `failure` is the failure of the lookup at the expiration. */
export type BroadcastSettledListener = (
  broadcast: IUnconfirmedBroadcast,
  settlement: BroadcastSettlement,
  failure?: unknown
) => void;

export interface ISettleClock {
  now: () => number;
  /** Resolves after `ms` milliseconds. */
  wait: (ms: number) => Promise<void>;
}

const REAL_CLOCK: ISettleClock = {
  now: () => Date.now(),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
};

/**
 * The broadcasts of this page that may still apply, held until their expiration or a block includes them.
 * Each one recorded is looked up every `SETTLE_POLL_INTERVAL_MS` until then, and `onSettled` is told how
 * it settled, unless `checkResend` reported it applied first.
 */
export class UnconfirmedBroadcasts {
  private pending: IUnconfirmedBroadcast[] = [];

  constructor(
    private readonly lookUpInclusion: InclusionLookup,
    private readonly onSettled: BroadcastSettledListener,
    private readonly clock: ISettleClock = REAL_CLOCK
  ) {}

  record(broadcast: IUnconfirmedBroadcast): void {
    this.pending.push(broadcast);
    void this.settle(broadcast);
  }

  /**
   * Resolves when `operations` were not sent in a broadcast that may still apply. Otherwise asks the node
   * whether a block includes that broadcast and rejects with `EarlierBroadcastPendingError`: `applied`
   * when one does (and forgets it), else `may_still_apply`, with the lookup's failure as `cause`.
   */
  async checkResend(operations: string): Promise<void> {
    const earlier = this.findPending(operations);
    if (!earlier) return;
    let included = false;
    let lookupFailure: unknown;
    try {
      included = await this.lookUpInclusion(earlier.transactionIds);
    } catch (error) {
      // The node cannot tell: the earlier broadcast may still apply
      lookupFailure = error;
    }
    if (included) {
      this.forget(earlier);
      throw new EarlierBroadcastPendingError(earlier.transactionId, 'applied', earlier.expiration);
    }
    if (!this.findPending(operations)) return;
    throw new EarlierBroadcastPendingError(
      earlier.transactionId,
      'may_still_apply',
      earlier.expiration,
      lookupFailure
    );
  }

  /**
   * Looks `broadcast` up until a block includes it or its expiration, plus a block interval, has passed,
   * waiting a poll interval before the first lookup. A lookup failure before then is retried at the next.
   */
  private async settle(broadcast: IUnconfirmedBroadcast): Promise<void> {
    const deadline = broadcast.expiration.getTime() + BLOCK_INTERVAL_MS;
    let wait = SETTLE_POLL_INTERVAL_MS;
    for (;;) {
      await this.clock.wait(wait);
      if (!this.pending.includes(broadcast)) return;
      const final = this.clock.now() >= deadline;
      let settlement: BroadcastSettlement | undefined;
      let failure: unknown;
      try {
        if (await this.lookUpInclusion(broadcast.transactionIds)) settlement = 'applied';
        else if (final) settlement = 'expired';
      } catch (error) {
        // The node cannot tell: ask again, or at the expiration report the outcome unknown
        failure = error;
        if (final) settlement = 'unknown';
      }
      // `checkResend` reported it applied meanwhile
      if (!this.pending.includes(broadcast)) return;
      if (settlement) {
        this.forget(broadcast);
        this.onSettled(broadcast, settlement, failure);
        return;
      }
      wait = Math.min(SETTLE_POLL_INTERVAL_MS, Math.max(deadline - this.clock.now(), 0));
    }
  }

  private findPending(operations: string): IUnconfirmedBroadcast | undefined {
    const now = this.clock.now();
    return this.pending.find(
      (broadcast) =>
        broadcast.operations === operations && broadcast.expiration.getTime() + BLOCK_INTERVAL_MS > now
    );
  }

  private forget(broadcast: IUnconfirmedBroadcast): void {
    this.pending = this.pending.filter((candidate) => candidate !== broadcast);
  }
}

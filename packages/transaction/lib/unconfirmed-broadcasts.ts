import type { InclusionLookup } from './transaction-inclusion';

// A block whose timestamp is the expiration's second can still include the transaction; it arrives about
// a block interval later.
const BLOCK_INTERVAL_MS = 3_000;

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

/** The broadcasts of this page that may still apply, held until their expiration or a block includes them. */
export class UnconfirmedBroadcasts {
  private pending: IUnconfirmedBroadcast[] = [];

  constructor(
    private readonly lookUpInclusion: InclusionLookup,
    private readonly now: () => number = Date.now
  ) {}

  record(broadcast: IUnconfirmedBroadcast): void {
    this.pending.push(broadcast);
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

  private findPending(operations: string): IUnconfirmedBroadcast | undefined {
    const now = this.now();
    this.pending = this.pending.filter(({ expiration }) => expiration.getTime() + BLOCK_INTERVAL_MS > now);
    return this.pending.find((broadcast) => broadcast.operations === operations);
  }

  private forget(broadcast: IUnconfirmedBroadcast): void {
    this.pending = this.pending.filter((candidate) => candidate !== broadcast);
  }
}

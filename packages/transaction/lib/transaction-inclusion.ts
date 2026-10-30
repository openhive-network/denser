export const INCLUSION_TIMEOUT_MS = 10_000;

/** The part of a WorkerBee bot that reports a transaction landing in a block. */
export interface ITransactionIdObserver {
  observe: {
    onTransactionIds(transactionId: string): {
      subscribe(observer: { next: () => void; error: (error: unknown) => void }): { unsubscribe(): void };
    };
  };
}

export interface IInclusionWatch {
  /**
   * True once a block includes the transaction, false when `timeoutMs` passes first or the watch is
   * cancelled. Rejects with the bot's error when it cannot scan blocks.
   */
  readonly included: Promise<boolean>;
  cancel(): void;
}

/** Watches `bot`'s blocks for `transactionId`; subscribe before broadcasting so no block is missed. */
export function watchInclusion(
  bot: ITransactionIdObserver,
  transactionId: string,
  timeoutMs = INCLUSION_TIMEOUT_MS
): IInclusionWatch {
  let finish: (included: boolean) => void = () => {};
  let fail: (error: unknown) => void = () => {};
  const included = new Promise<boolean>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  const subscription = bot.observe.onTransactionIds(transactionId).subscribe({
    next: () => finish(true),
    error: fail
  });
  const timer = setTimeout(() => finish(false), timeoutMs);
  // The first outcome settles `included`; later reports from the bot or the timer are no-ops
  const stopWatching = () => {
    clearTimeout(timer);
    subscription.unsubscribe();
  };
  included.then(stopWatching, stopWatching);
  return { included, cancel: () => finish(false) };
}

/**
 * WorkerBee's `broadcast` rejects with this text when the node accepted the transaction but no block
 * the bot scanned before `expireInMs` included it.
 */
const LISTENER_EXPIRED_PATTERN = /broadcasted successfully, but listener has expired/;

/** An observed broadcast the node accepted but no block was seen to include in time; it may still apply. */
export class TransactionNotConfirmedError extends Error {
  readonly transactionId: string;

  constructor(transactionId: string, cause?: unknown) {
    super(`Transaction ${transactionId} was broadcast but not seen in a block in time`, { cause });
    this.name = 'TransactionNotConfirmedError';
    this.transactionId = transactionId;
  }
}

/** `error` as a `TransactionNotConfirmedError` when it is WorkerBee's expired-listener rejection, else as is. */
export function toNotConfirmedError(error: unknown, transactionId: string): unknown {
  return error instanceof Error && LISTENER_EXPIRED_PATTERN.test(error.message)
    ? new TransactionNotConfirmedError(transactionId, error)
    : error;
}

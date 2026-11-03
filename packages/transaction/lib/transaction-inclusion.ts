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

/**
 * Wax's message for a request that got no answer in time (`WaxRequestTimeoutError`, though wax's bundle
 * names it `WaxError`).
 */
const REQUEST_TIMED_OUT_PATTERN = /^Request timed out\b/;

/**
 * The reads wax 1.28.8's `OnChainOperationValidator` (`performOnChainVerification`) makes before it sends
 * the transaction: the memo key-leak scan's account lookup and the account-exists check.
 */
const PRE_BROADCAST_VERIFICATION_METHODS = new Set(['database_api.find_accounts', 'rc_api.find_rc_accounts']);

function parseRequestData(data: unknown): unknown {
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
}

/** The JSON-RPC method of the request a wax `WaxRequestError` carries, if it has one. */
function jsonRpcMethodOf(error: Error): string | undefined {
  const request: unknown = 'request' in error ? error.request : undefined;
  if (typeof request !== 'object' || request === null || !('data' in request)) return undefined;
  const payload = parseRequestData(request.data);
  if (typeof payload !== 'object' || payload === null || !('method' in payload)) return undefined;
  return typeof payload.method === 'string' ? payload.method : undefined;
}

/** True for wax's error for a request to the node that got no answer in time. */
export function isWaxRequestTimeout(error: unknown): error is Error {
  return error instanceof Error && error.name.startsWith('Wax') && REQUEST_TIMED_OUT_PATTERN.test(error.message);
}

/**
 * True for a request timeout on the broadcast path that may have come after the node took the
 * transaction: the `broadcast_transaction` request itself, or a read of the block scanner watching for
 * it. Only a timeout of one of wax's pre-broadcast verification reads proves nothing was sent; one whose
 * request method cannot be read counts as possibly sent, so the user checks before retrying.
 */
function isUnconfirmedRequestTimeout(error: Error): boolean {
  if (!isWaxRequestTimeout(error)) return false;
  const method = jsonRpcMethodOf(error);
  return method === undefined || !PRE_BROADCAST_VERIFICATION_METHODS.has(method);
}

/**
 * A broadcast that may still apply: the node accepted it but no block was seen to include it in time,
 * or a request timed out after the transaction may have reached the node.
 */
export class TransactionNotConfirmedError extends Error {
  readonly transactionId: string;

  constructor(transactionId: string, cause?: unknown) {
    super(`Transaction ${transactionId} was broadcast but not seen in a block in time`, { cause });
    this.name = 'TransactionNotConfirmedError';
    this.transactionId = transactionId;
  }
}

/**
 * `error` as a `TransactionNotConfirmedError` when it is WorkerBee's expired-listener rejection or a
 * request timeout other than of a pre-broadcast verification read, else as is.
 */
export function toNotConfirmedError(error: unknown, transactionId: string): unknown {
  return error instanceof Error &&
    (LISTENER_EXPIRED_PATTERN.test(error.message) || isUnconfirmedRequestTimeout(error))
    ? new TransactionNotConfirmedError(transactionId, error)
    : error;
}

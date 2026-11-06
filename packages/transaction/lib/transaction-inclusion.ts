import type { TTransactionPackType } from '@hiveio/wax';

export const INCLUSION_TIMEOUT_MS = 10_000;

/** What the bot passes for each block it scans: the watched transactions that block includes, by id. */
export interface IScannedBlock {
  transactions: Partial<Record<string, unknown>>;
}

/** The part of a WorkerBee bot that reports each block it scans and the watched transactions in it. */
export interface ITransactionIdObserver {
  observe: {
    onTransactionIds(...transactionIds: string[]): {
      onBlock(): {
        subscribe(observer: { next: (block: IScannedBlock) => void; error: (error: unknown) => void }): {
          unsubscribe(): void;
        };
      };
    };
  };
}

/**
 * Asks the node whether a block includes a transaction known by any of `transactionIds`; rejects
 * when the node cannot tell.
 */
export type InclusionLookup = (transactionIds: readonly string[]) => Promise<boolean>;

/** `transaction_status_api.find_transaction`: where the node saw a transaction, by its id in blocks. */
export type FindTransaction = (params: { transaction_id: string }) => Promise<{ status: string }>;

const IN_BLOCK_STATUSES = new Set(['within_reversible_block', 'within_irreversible_block']);

/**
 * An `InclusionLookup` asking `findTransaction` about each of the ids. Rejects with a request's
 * failure when no id was found in a block and a request failed.
 */
export function inclusionLookupVia(findTransaction: FindTransaction): InclusionLookup {
  return async (transactionIds) => {
    const answers = await Promise.allSettled(
      [...new Set(transactionIds)].map((id) => findTransaction({ transaction_id: id }))
    );
    if (answers.some((answer) => answer.status === 'fulfilled' && IN_BLOCK_STATUSES.has(answer.value.status)))
      return true;
    const failure = answers.find((answer): answer is PromiseRejectedResult => answer.status === 'rejected');
    if (failure) throw failure.reason;
    return false;
  };
}

export interface IInclusionWatch {
  /**
   * True once a block includes the transaction, false when `timeoutMs` passes first after the bot
   * scanned at least one block, or the watch is cancelled. Rejects when no block was scanned in time,
   * with the bot's last scanner error as `cause`. After a scanner error, the timeout's answer is the
   * lookup's instead, rejecting when the lookup fails.
   */
  readonly included: Promise<boolean>;
  cancel(): void;
}

/**
 * The pack types of wax's `TTransactionPackType` as their values, so this module loads without the
 * ESM-only wax.
 */
type TransactionPack = `${TTransactionPackType}`;

/**
 * The id a block lists for `transaction` signed in `pack`. hived takes a transaction signed in the
 * legacy serialization (Keychain, PeakVault, HiveAuth) re-packed as legacy, and the two ids differ
 * once the transaction serializes an asset.
 */
export function recordedTransactionId(
  transaction: { id: string; legacy_id: string },
  pack: TransactionPack
): string {
  return pack === 'legacy' ? transaction.legacy_id : transaction.id;
}

/**
 * Watches `bot`'s blocks for a transaction known by any of `transactionIds` (its HF26 and legacy ids);
 * subscribe before broadcasting so no block is missed. A scanner error is taken as transient: the
 * subscription stays and the next poll may still find the transaction. The poll may never scan the
 * block the error left out, though (WorkerBee's first poll after a failed first read of a fresh bot
 * starts from the new head, and a catch-up read stops one block short of it), so once one occurred,
 * `lookUpInclusion` answers at the timeout in place of the blocks scanned.
 */
export function watchInclusion(
  bot: ITransactionIdObserver,
  transactionIds: readonly string[],
  timeoutMs = INCLUSION_TIMEOUT_MS,
  lookUpInclusion?: InclusionLookup
): IInclusionWatch {
  let finish: (included: boolean) => void = () => {};
  let fail: (error: unknown) => void = () => {};
  const included = new Promise<boolean>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  let scannedBlock = false;
  let scanFailed = false;
  let lastScanError: unknown;
  const subscription = bot.observe
    .onTransactionIds(...transactionIds)
    .onBlock()
    .subscribe({
      next: ({ transactions }) => {
        scannedBlock = true;
        if (transactionIds.some((id) => transactions[id] !== undefined)) finish(true);
      },
      error: (error) => {
        scanFailed = true;
        lastScanError = error;
      }
    });
  const onTimeout = () => {
    if (scanFailed && lookUpInclusion) {
      lookUpInclusion(transactionIds).then(finish, (error: unknown) =>
        fail(new Error('Cannot look up the transaction after a scanner error', { cause: error }))
      );
      return;
    }
    // Without a scanned block the timeout says nothing about the transaction
    if (scannedBlock) finish(false);
    else fail(new Error(`No block scanned within ${timeoutMs} ms`, { cause: lastScanError }));
  };
  const timer = setTimeout(onTimeout, timeoutMs);
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
 * The message for a request that failed on the network (connection refused, reset or dropped, a CORS
 * refusal): wax's `WaxUnknownRequestError`, which its bundle can name `WaxError`, and the read client's
 * `ReadTransportError`.
 */
const NETWORK_FAILURE_PATTERN = /^Unknown request error caught\b/;

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

/** True for a node request, by wax or the read client, that failed on the network before any answer. */
export function isNodeNetworkFailure(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (error.name.startsWith('Wax') || error.name === 'ReadTransportError') &&
    NETWORK_FAILURE_PATTERN.test(error.message)
  );
}

const MAX_CAUSE_DEPTH = 5;

/**
 * The name webpack's and Turbopack's runtimes give the error of a script chunk that could not be
 * loaded, as `findChunkLoadError` of `@hive/ui` reads it; this module loads without the app's aliases.
 */
const CHUNK_LOAD_ERROR_NAME = 'ChunkLoadError';

/**
 * `error` or, a few levels deep, its `cause` that `matches`: a signer that wraps the failure of a node
 * read (hb-auth's unlock checks the key against the account) keeps it as the cause.
 */
function findInCauses(error: unknown, matches: (candidate: Error) => boolean): Error | undefined {
  let current = error;
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
    const { cause } = current;
    if (matches(current)) return current;
    current = cause;
  }
  return undefined;
}

/** Wax's request timeout that is `error` or, a few levels deep, its `cause`. */
export function findWaxRequestTimeout(error: unknown): Error | undefined {
  return findInCauses(error, isWaxRequestTimeout);
}

/** A node request's network failure that is `error` or, a few levels deep, its `cause`. */
export function findNodeNetworkFailure(error: unknown): Error | undefined {
  return findInCauses(error, isNodeNetworkFailure);
}

/**
 * True for a request timeout or network failure on the broadcast path that may have come after the
 * node took the transaction: the `broadcast_transaction` request itself, or a read of the block scanner
 * watching for it. A request that never got an answer may still have reached the node. Only a failure
 * of one of wax's pre-broadcast verification reads proves nothing was sent; one whose request method
 * cannot be read counts as possibly sent, so the user checks before retrying.
 */
function isUnconfirmedRequestFailure(error: Error): boolean {
  if (!isWaxRequestTimeout(error) && !isNodeNetworkFailure(error)) return false;
  const method = jsonRpcMethodOf(error);
  return method === undefined || !PRE_BROADCAST_VERIFICATION_METHODS.has(method);
}

/**
 * A broadcast that may still apply: the node accepted it but no block was seen to include it in time,
 * or a request timed out or failed on the network after the transaction may have reached the node.
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
 * `error` as a `TransactionNotConfirmedError` when it is WorkerBee's expired-listener rejection, a
 * request timeout or network failure other than of a pre-broadcast verification read, or a chunk load
 * failure, else as is. A chunk load failure carries no request to tell when it happened: the failover
 * chain loads code on a read's first failure, which may be a read of the block scanner after the node
 * took the transaction, so it counts as possibly sent.
 */
export function toNotConfirmedError(error: unknown, transactionId: string): unknown {
  return error instanceof Error &&
    (LISTENER_EXPIRED_PATTERN.test(error.message) ||
      isUnconfirmedRequestFailure(error) ||
      findInCauses(error, (candidate) => candidate.name === CHUNK_LOAD_ERROR_NAME) !== undefined)
    ? new TransactionNotConfirmedError(transactionId, error)
    : error;
}

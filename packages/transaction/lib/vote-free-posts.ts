import type { Entry } from '@hive/common-hiveio-packages/wax';
import { getLogger } from '@ui/lib/logging';
import { JsonRpcApiError } from './read-client';

const logger = getLogger('vote-free-posts');

/** The suffix of a vote-free post read's method: `bridge.get_post_v2` is `bridge.get_post` without votes. */
export const VOTE_FREE_SUFFIX = '_v2';

/** JSON-RPC "method not found". */
const METHOD_NOT_FOUND_CODE = -32601;
/** What hivemind's assertion says of a method it does not have (as -32602, with the namespace mangled). */
const UNKNOWN_METHOD_MESSAGE = 'unknown method';

/**
 * Whether `error` is a node's answer to a method it does not have: hivemind's
 * "Assert Exception:unknown method: …" or JSON-RPC's "method not found". Any other answer, and any
 * transport failure, says nothing about the node's methods.
 */
export const isUnknownMethodError = (error: unknown): boolean => {
  if (!(error instanceof JsonRpcApiError)) return false;
  const { response } = error;
  if (typeof response !== 'object' || response === null || !('error' in response)) return false;
  const answer = response.error;
  if (typeof answer !== 'object' || answer === null) return false;
  if ('code' in answer && answer.code === METHOD_NOT_FOUND_CODE) return true;
  return 'message' in answer && typeof answer.message === 'string' && answer.message.includes(UNKNOWN_METHOD_MESSAGE);
};

/** The nodes found to lack a capability: the vote-free post reads, or JSON-RPC batches. */
export interface IVoteFreeSupport {
  lacks(node: string): boolean;
  markLacking(node: string): void;
}

/** A record of the nodes found lacking (e.g. that answered a vote-free read with "unknown method"), kept as long as it lives. */
export const createVoteFreeSupport = (): IVoteFreeSupport => {
  const lacking = new Set<string>();
  return {
    lacks: (node) => lacking.has(node),
    markLacking: (node) => {
      lacking.add(node);
    }
  };
};

/**
 * `voteFree()`, the vote-free read, unless `node` (where it would go) is known to lack it; then, and
 * when it is answered with "unknown method", `stock()`, the same read with votes. That answer marks
 * the node that gave it (the error's endpoint, else `node`) as lacking the vote-free reads, so later
 * reads skip them; no other failure does, and every other error of `voteFree()` is thrown.
 */
export async function readVoteFree<T>(
  support: IVoteFreeSupport,
  node: string,
  voteFree: () => Promise<T>,
  stock: () => Promise<T>
): Promise<T> {
  if (support.lacks(node)) return stock();
  try {
    return await voteFree();
  } catch (error) {
    if (!isUnknownMethodError(error)) throw error;
    const answered = (error instanceof JsonRpcApiError && error.endpoint) || node;
    logger.info('%s has no vote-free post reads, reading posts with their votes', answered);
    support.markLacking(answered);
    return stock();
  }
}

/**
 * `entry` as the rest of the app reads it: a vote-free entry (one without `active_votes`) carries
 * `observer_vote` (null when absent) and `_observer`, the observer it was read as, so that the vote
 * is not taken for another account's. A stock entry is returned as is.
 */
export function withObserverVote(entry: Entry, observer: string): Entry {
  if (entry.active_votes) return entry;
  return { ...entry, observer_vote: entry.observer_vote ?? null, _observer: observer };
}

/** `withObserverVote` of each entry of a list. */
export const listWithObserverVotes = (entries: Entry[] | null, observer: string): Entry[] | null =>
  entries && entries.map((entry) => withObserverVote(entry, observer));

/** `withObserverVote` of each entry of a discussion, keyed as it was. */
export const discussionWithObserverVotes = (
  discussion: Record<string, Entry> | null,
  observer: string
): Record<string, Entry> | null =>
  discussion &&
  Object.fromEntries(Object.entries(discussion).map(([key, entry]) => [key, withObserverVote(entry, observer)]));

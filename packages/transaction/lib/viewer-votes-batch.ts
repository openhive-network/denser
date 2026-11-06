import type { IVoteListItem } from '@hive/common-hiveio-packages/wax';
import { getLogger } from '@ui/lib/logging';
import { isRequestRejected, ReadTransportError } from './read-transport';
import { createVoteFreeSupport, type IVoteFreeSupport } from './vote-free-posts';

const logger = getLogger('viewer-votes-batch');

/** The answer of `database_api.list_votes` for one voter on one post: their vote, or none. */
export interface IViewerVoteAnswer {
  votes: IVoteListItem[];
}

/** A post whose vote of `viewer` is looked up. */
export interface IViewerVoteTarget {
  author: string;
  permlink: string;
  viewer: string;
}

/** How long lookups are collected into one batch: the cards of a page mount within it. */
export const VOTE_BATCH_WINDOW_MS = 10;
/** The most calls one batch request carries; a longer page (a long discussion) sends several. */
export const MAX_VOTE_BATCH_SIZE = 50;

/** One `database_api.list_votes` call per target, its id the target's index. */
export const buildListVotesBatch = (targets: readonly IViewerVoteTarget[]): object[] =>
  targets.map(({ author, permlink, viewer }, id) => ({
    jsonrpc: '2.0',
    method: 'database_api.list_votes',
    params: { start: [author, permlink, viewer], limit: 1, order: 'by_comment_voter' },
    id
  }));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isVoteOf = (vote: unknown, { author, permlink, viewer }: IViewerVoteTarget): vote is IVoteListItem =>
  isRecord(vote) && vote.voter === viewer && vote.author === author && vote.permlink === permlink;

/**
 * The viewer's vote on each of `targets` (by index) from the answer to `buildListVotesBatch(targets)`:
 * only a vote of the viewer on that very post is kept (`by_comment_voter` lists the next vote when they
 * have none). A target whose call was answered with an error, or not at all, is `undefined`. Null
 * when `answer` is no batch answer (not an array), i.e. the node or a proxy rejected the batch.
 */
export function parseListVotesBatch(
  answer: unknown,
  targets: readonly IViewerVoteTarget[]
): (IViewerVoteAnswer | undefined)[] | null {
  if (!Array.isArray(answer)) return null;
  const results: (IViewerVoteAnswer | undefined)[] = targets.map(() => undefined);
  for (const reply of answer) {
    if (!isRecord(reply) || typeof reply.id !== 'number' || !isRecord(reply.result)) continue;
    const target = targets[reply.id];
    const { votes } = reply.result;
    if (!target || !Array.isArray(votes)) continue;
    results[reply.id] = { votes: votes.filter((vote) => isVoteOf(vote, target)) };
  }
  return results;
}

export interface IViewerVoteBatcherOptions {
  /** The node the batch goes to: the one the vote-free posts were read from. */
  nodeOf: () => Promise<string>;
  /** Posts `batch` to `node` and resolves to the parsed body; fails with `ReadTransportError`. */
  send: (node: string, batch: object[]) => Promise<unknown>;
  /** The lookup of one target on its own, for a target the batch could not answer. */
  lookUpOne: (target: IViewerVoteTarget) => Promise<IViewerVoteAnswer>;
  /** The nodes found to reject batches; one for the life of the batcher by default. */
  support?: IVoteFreeSupport;
  windowMs?: number;
  maxBatchSize?: number;
}

interface IPendingLookup {
  target: IViewerVoteTarget;
  waiters: { resolve: (answer: IViewerVoteAnswer) => void; reject: (error: unknown) => void }[];
}

/** Whether a failed batch request was the node (or a proxy) refusing it, rather than a transport failure. */
const isBatchRejected = (error: ReadTransportError): boolean =>
  error.status !== undefined && isRequestRejected(error.status);

/**
 * A lookup of a viewer's vote on a post that collects the lookups made within `windowMs` and asks
 * for them in JSON-RPC batches of up to `maxBatchSize` calls, sent to `nodeOf()`. A lone lookup, and
 * every target the batch left unanswered, is looked up on its own (`lookUpOne`). A node that answers
 * a batch with something other than an array, or with a 4xx status, is recorded in `support` and
 * gets no more batches: its lookups go one by one. A batch failing on transport is looked up one by
 * one as well, without recording the node. Any other error of `send` rejects the batch's lookups.
 */
export function createViewerVoteBatcher({
  nodeOf,
  send,
  lookUpOne,
  support = createVoteFreeSupport(),
  windowMs = VOTE_BATCH_WINDOW_MS,
  maxBatchSize = MAX_VOTE_BATCH_SIZE
}: IViewerVoteBatcherOptions): (target: IViewerVoteTarget) => Promise<IViewerVoteAnswer> {
  let pending = new Map<string, IPendingLookup>();

  const settleOne = (lookup: IPendingLookup, answer: Promise<IViewerVoteAnswer>): void => {
    answer.then(
      (votes) => lookup.waiters.forEach(({ resolve }) => resolve(votes)),
      (error) => lookup.waiters.forEach(({ reject }) => reject(error))
    );
  };

  const lookUpEach = (lookups: readonly IPendingLookup[]): void =>
    lookups.forEach((lookup) => settleOne(lookup, lookUpOne(lookup.target)));

  const askBatch = async (node: string, lookups: readonly IPendingLookup[]): Promise<void> => {
    const targets = lookups.map(({ target }) => target);
    let answer: unknown;
    try {
      answer = await send(node, buildListVotesBatch(targets));
    } catch (error) {
      if (!(error instanceof ReadTransportError)) throw error;
      if (isBatchRejected(error)) {
        logger.info('%s rejects JSON-RPC batches (%s), looking votes up one by one', node, error.message);
        support.markLacking(node);
      } else {
        logger.warn('vote batch on %s failed (%s), looking votes up one by one', node, error.message);
      }
      lookUpEach(lookups);
      return;
    }
    const results = parseListVotesBatch(answer, targets);
    if (!results) {
      logger.info('%s answers no JSON-RPC batches, looking votes up one by one', node);
      support.markLacking(node);
      lookUpEach(lookups);
      return;
    }
    lookups.forEach((lookup, index) => {
      const result = results[index];
      settleOne(lookup, result ? Promise.resolve(result) : lookUpOne(lookup.target));
    });
  };

  const flushChunk = async (lookups: readonly IPendingLookup[]): Promise<void> => {
    if (lookups.length === 1) return lookUpEach(lookups);
    const node = await nodeOf();
    if (support.lacks(node)) return lookUpEach(lookups);
    return askBatch(node, lookups);
  };

  const flush = (): void => {
    const lookups = [...pending.values()];
    pending = new Map();
    for (let start = 0; start < lookups.length; start += maxBatchSize) {
      const chunk = lookups.slice(start, start + maxBatchSize);
      flushChunk(chunk).catch((error) => chunk.forEach(({ waiters }) => waiters.forEach(({ reject }) => reject(error))));
    }
  };

  return (target) =>
    new Promise((resolve, reject) => {
      if (pending.size === 0) setTimeout(flush, windowMs);
      const key = JSON.stringify([target.author, target.permlink, target.viewer]);
      const lookup = pending.get(key) ?? { target, waiters: [] };
      lookup.waiters.push({ resolve, reject });
      pending.set(key, lookup);
    });
}

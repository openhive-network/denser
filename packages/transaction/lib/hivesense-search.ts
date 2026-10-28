import { ReadTransportError } from './read-transport';

/**
 * Bound for the `sync-status` availability probe. It shares the search
 * endpoints' postgrest pool, so a hung search hangs it too and AI mode turns
 * off instead of leaving the search page blank (#947).
 */
export const HIVE_SENSE_PROBE_TIMEOUT_MS = 8000;

/** Bound for the search calls the results page actually waits on (#947). */
export const AI_SEARCH_REQUEST_TIMEOUT_MS = 12000;

/**
 * One empty `posts/by-ids` page is enough to stop. Advancing anyway kept the
 * load-more sentinel in view and walked the stub list forever (#949).
 */
export const MAX_CONSECUTIVE_EMPTY_AI_PAGES = 1;

export const isHiveSenseStub = (post: object): post is { author: string; permlink: string } => {
  return !('title' in post) && !('body' in post) && 'author' in post && 'permlink' in post;
};

/**
 * HiveSense full entries currently omit `post_id`. Requiring it dropped every
 * hit, so guest AI search rendered nothing while auto-pagination churned.
 * A renderable entry has author + permlink and is not a stub (has a title,
 * or a numeric post_id from older responses).
 */
export const isRenderableSearchEntry = (post: unknown): boolean => {
  if (!post || typeof post !== 'object') return false;
  const entry = post as { author?: unknown; permlink?: unknown; post_id?: unknown };
  if (typeof entry.author !== 'string' || entry.author.length === 0) return false;
  if (typeof entry.permlink !== 'string' || entry.permlink.length === 0) return false;
  if (isHiveSenseStub(post)) return false;
  return 'title' in entry || typeof entry.post_id === 'number';
};

/**
 * Whether a HiveSense `/sync-status` body says the node is serving: a numeric
 * `last_block_num` and a string `last_block_time` (null until the node has
 * processed its first block).
 */
export const hiveSenseSyncStatusLooksHealthy = (body: unknown): boolean => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  if (!('last_block_num' in body) || !('last_block_time' in body)) return false;
  return typeof body.last_block_num === 'number' && typeof body.last_block_time === 'string';
};

export const partitionHiveSensePosts = <T extends object>(
  posts: ReadonlyArray<T | null | undefined> | null | undefined
): { fullPosts: T[]; stubPosts: T[] } => {
  const fullPosts: T[] = [];
  const stubPosts: T[] = [];
  if (!posts) return { fullPosts, stubPosts };

  for (const post of posts) {
    if (!post) continue;
    if (isHiveSenseStub(post)) {
      stubPosts.push(post);
    } else if (isRenderableSearchEntry(post)) {
      fullPosts.push(post);
    }
  }

  return { fullPosts, stubPosts };
};

export interface AiSearchPageAdvance {
  currentPage: number;
  consecutiveEmpty: number;
  /** Stop auto-fetch. Do not keep the sentinel requesting empty pages. */
  stop: boolean;
}

export const nextAiSearchPageState = (input: {
  currentPage: number;
  validCount: number;
  consecutiveEmpty: number;
  maxConsecutiveEmpty?: number;
}): AiSearchPageAdvance => {
  const max = input.maxConsecutiveEmpty ?? MAX_CONSECUTIVE_EMPTY_AI_PAGES;
  if (input.validCount > 0) {
    return { currentPage: input.currentPage + 1, consecutiveEmpty: 0, stop: false };
  }
  const consecutiveEmpty = input.consecutiveEmpty + 1;
  return {
    // Leave the page index where it is. Advancing on zero valid posts is what
    // let useInView walk the whole stub list with nothing on screen (#949).
    currentPage: input.currentPage,
    consecutiveEmpty,
    stop: consecutiveEmpty >= max
  };
};

export const promiseWithTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
};

const NO_EMBEDDING_ERROR_CODE = 'P0001';
const NO_EMBEDDING_MESSAGE = /has no stored embedding/;

/**
 * Whether HiveSense refused a similar-posts request because the post has no stored embedding (too
 * short or not yet processed). It answers that with an HTTP 400 PostgREST error; it means "no
 * similar posts", not a failure.
 */
export const isHiveSenseNoEmbeddingError = (error: unknown): boolean => {
  if (!(error instanceof ReadTransportError) || error.status !== 400) return false;
  const body = error.body;
  if (!body || typeof body !== 'object' || !('code' in body) || !('message' in body)) return false;
  return (
    body.code === NO_EMBEDDING_ERROR_CODE &&
    typeof body.message === 'string' &&
    NO_EMBEDDING_MESSAGE.test(body.message)
  );
};

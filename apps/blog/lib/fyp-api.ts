import type { Entry } from '@hive/common-hiveio-packages/wax';
import { dropUnfinishedMarkup } from './cut-body.ts';
import { FYP_PAGE_SIZE } from './fyp-paging.ts';

/** How long a feed page may take before the request is abandoned. */
export const FYP_REQUEST_TIMEOUT_MS = 10_000;
/**
 * Cards only show a summary, so the bodies are cut server-side to keep a page small. Long enough
 * to get past the few images many posts open with to the text a summary is made of.
 */
const TRUNCATED_BODY_LENGTH = 1000;

/** How haf_fyp ranked a post. `post_id` is a string: it can exceed Number.MAX_SAFE_INTEGER. */
export interface FypRanking {
  rank: number;
  source: 'personalized' | 'global';
  post_id: string;
  algorithm_version: string;
}

/** A feed post: a `bridge.get_ranked_posts` entry plus its ranking. */
export type FypEntry = Entry & { fyp: FypRanking };

/** The For You feed could not be read: unreachable, timed out, an HTTP error or an unexpected body. */
export class FypApiError extends Error {
  /** haf_fyp did not answer in time, or answered with a server error: asking again at once won't help. */
  readonly serviceDown: boolean;

  constructor(message: string, options?: ErrorOptions & { serviceDown?: boolean }) {
    super(message, options);
    this.serviceDown = options?.serviceDown ?? false;
  }
}

/**
 * React Query's `retry` for a For You feed read: one retry, none when haf_fyp is down, so a
 * failure shows within one request timeout instead of after a backoff of several.
 */
export const retryFypRead = (failureCount: number, error: unknown): boolean =>
  !(error instanceof FypApiError && error.serviceDown) && failureCount < 1;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFypEntry = (value: unknown): value is FypEntry =>
  isObject(value) &&
  typeof value.author === 'string' &&
  typeof value.permlink === 'string' &&
  isObject(value.fyp) &&
  typeof value.fyp.post_id === 'string';

/**
 * One page of `account`'s For You feed.
 *
 * @param baseUrl - the haf_fyp API root, e.g. `https://api.syncad.com/haf-fyp-api`
 * @param page - 1-based page number
 * @throws FypApiError when the request fails, takes longer than `timeoutMs`, or answers anything but a list of posts
 */
export async function getFypFeedPage(
  baseUrl: string,
  account: string,
  page: number,
  timeoutMs: number = FYP_REQUEST_TIMEOUT_MS
): Promise<FypEntry[]> {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/v1/fyp/feed/${encodeURIComponent(account)}`);
  url.searchParams.set('page', String(page));
  url.searchParams.set('page-size', String(FYP_PAGE_SIZE));
  url.searchParams.set('truncate_body', String(TRUNCATED_BODY_LENGTH));

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new FypApiError(`For You feed request failed: ${url}`, { cause: error, serviceDown: true });
  }
  if (!response.ok) {
    throw new FypApiError(`For You feed answered HTTP ${response.status}: ${url}`, {
      serviceDown: response.status >= 500
    });
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch (error) {
    throw new FypApiError(`For You feed answered invalid JSON: ${url}`, { cause: error });
  }
  if (!Array.isArray(body) || !body.every(isFypEntry)) {
    throw new FypApiError(`For You feed answered an unexpected body: ${url}`);
  }
  return body.map(dropCutMarkup);
}

/**
 * Asks haf_fyp to re-rank `account`'s feed ahead of its next read, without opening a read session.
 *
 * @param baseUrl - the haf_fyp API root, as for `getFypFeedPage`
 * @throws FypApiError when the request fails, takes longer than `timeoutMs`, or answers an HTTP error
 *   (a haf_fyp without the warm-up endpoint answers 404)
 */
export async function requestFypWarmUp(
  baseUrl: string,
  account: string,
  timeoutMs: number = FYP_REQUEST_TIMEOUT_MS
): Promise<void> {
  const url = new URL(`${baseUrl.replace(/\/+$/, '')}/v1/fyp/warmup/${encodeURIComponent(account)}`);
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new FypApiError(`For You warm-up request failed: ${url}`, { cause: error, serviceDown: true });
  }
  if (!response.ok) {
    throw new FypApiError(`For You warm-up answered HTTP ${response.status}: ${url}`, {
      serviceDown: response.status >= 500
    });
  }
}

function dropCutMarkup(entry: FypEntry): FypEntry {
  if (typeof entry.body !== 'string') return entry;
  return { ...entry, body: dropUnfinishedMarkup(entry.body, TRUNCATED_BODY_LENGTH) };
}

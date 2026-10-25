import type { Entry } from '@hive/common-hiveio-packages/wax';

/** Posts per page of the For You feed; a shorter page is its last one. */
export const FYP_PAGE_SIZE = 20;
/** How long a feed page may take before the request is abandoned. */
export const FYP_REQUEST_TIMEOUT_MS = 10_000;
/** Cards only show a summary, so the bodies are cut server-side to keep a page small. */
const TRUNCATED_BODY_LENGTH = 300;

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
export class FypApiError extends Error {}

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
    throw new FypApiError(`For You feed request failed: ${url}`, { cause: error });
  }
  if (!response.ok) {
    throw new FypApiError(`For You feed answered HTTP ${response.status}: ${url}`);
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
  return body;
}

/**
 * The page after `pageNumber`, whose posts were `lastPage`; undefined when `lastPage` was short,
 * the end of the feed.
 */
export function nextFypPage(lastPage: readonly unknown[], pageNumber: number): number | undefined {
  return lastPage.length < FYP_PAGE_SIZE ? undefined : pageNumber + 1;
}

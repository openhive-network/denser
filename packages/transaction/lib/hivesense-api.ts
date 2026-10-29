import { logger } from '@ui/lib/logger';
import { Entry, MixedPostsResponse, PostStub } from '@hive/common-hiveio-packages/wax';
import { getReadChain } from './chain';
import { getHiveChainService } from './hive-chain-service';
import {
  AI_SEARCH_BODY_LENGTH,
  AI_SEARCH_REQUEST_TIMEOUT_MS,
  HIVE_SENSE_PROBE_TIMEOUT_MS,
  hiveSenseSyncStatusLooksHealthy,
  isHiveSenseNoEmbeddingError,
  isHiveSenseStub,
  isRenderableSearchEntry,
  promiseWithTimeout
} from './hivesense-search';

/**
 * Request timeout of the similar-posts call. A cold HiveSense similar-posts query took a healthy node
 * up to ~9 s before its cache warmed, well past the read chain's per-attempt timeout.
 */
const SIMILAR_POSTS_TIMEOUT_MS = 15_000;

const logStandarizedError = (methodName: string, error: unknown): null => {
  logger.error(error, `Error in ${methodName}`);
  throw new Error(`Error in ${methodName}`, { cause: error });
};

export const getHiveSenseStatus = async (): Promise<boolean> => {
  try {
    const base = getHiveChainService().getAiSearchEndpoint().replace(/\/$/, '');
    // A one-row lookup on the same postgrest pool as the search endpoints: when
    // searches hang or haproxy has marked hivesense down, this fails too.
    const response = await fetch(`${base}/hivesense-api/sync-status`, {
      signal: AbortSignal.timeout(HIVE_SENSE_PROBE_TIMEOUT_MS)
    });
    if (!response.ok) return false;
    return hiveSenseSyncStatusLooksHealthy(await response.json());
  } catch (error) {
    logger.error(error, 'Error in getHiveSenseStatus');
    return false;
  }
};

// New API functions using the updated endpoints

export const searchPosts = async ({
  query,
  truncate = AI_SEARCH_BODY_LENGTH,
  result_limit = 100,
  full_posts = 10,
  observer
}: {
  query: string;
  truncate?: number;
  result_limit?: number;
  full_posts?: number;
  observer: string;
}): Promise<MixedPostsResponse | null> => {
  try {
    const chain = getReadChain();
    const response = await promiseWithTimeout(
      chain.restApi['hivesense-api'].posts.search({
        q: query,
        truncate,
        result_limit,
        full_posts,
        observer
      }),
      AI_SEARCH_REQUEST_TIMEOUT_MS,
      'searchPosts'
    );
    return response;
  } catch (error) {
    return logStandarizedError('searchPosts', error);
  }
};

/**
 * Posts HiveSense finds similar to @author/permlink; `null` when there are none, the post has no
 * embedding yet, or the call failed (logged as a warning). Never rejects.
 */
export const getSimilarPostsByPost = async ({
  author,
  permlink,
  truncate = 100,
  result_limit = 100,
  full_posts = 10,
  observer
}: {
  author: string;
  permlink: string;
  truncate?: number;
  result_limit?: number;
  full_posts?: number;
  observer: string;
}): Promise<MixedPostsResponse | null> => {
  try {
    const chain = getReadChain().withTimeout(SIMILAR_POSTS_TIMEOUT_MS);
    const response = await chain.restApi['hivesense-api'].posts.author.permlink.similar({
      author,
      permlink,
      truncate,
      result_limit,
      full_posts,
      observer
    });
    return response;
  } catch (error) {
    if (isHiveSenseNoEmbeddingError(error)) return null;
    // Suggestions are optional: a failure only means there are none to show.
    logger.warn(error, 'getSimilarPostsByPost failed, showing no suggestions');
    return null;
  }
};

export const getPostsByIds = async ({
  posts,
  truncate = AI_SEARCH_BODY_LENGTH,
  observer
}: {
  posts: Array<{ author: string; permlink: string }>;
  truncate?: number;
  observer: string;
}): Promise<Entry[] | null> => {
  try {
    const chain = getReadChain();
    const response = await promiseWithTimeout(
      chain.restApi['hivesense-api'].posts.byIds({
        posts,
        truncate,
        observer
      }),
      AI_SEARCH_REQUEST_TIMEOUT_MS,
      'getPostsByIds'
    );

    if (Array.isArray(response)) {
      // Do not require post_id. Current HiveSense entries omit it; filtering
      // on it made every by-ids page look empty (#949).
      return response.filter((post): post is Entry => isRenderableSearchEntry(post));
    }
    return response;
  } catch (error) {
    return logStandarizedError('getPostsByIds', error);
  }
};

// Helper function to check if a post is a stub (only has author/permlink)
export const isPostStub = (post: Entry | PostStub): post is PostStub => {
  return isHiveSenseStub(post);
};

import { logger } from '@ui/lib/logger';
import { Entry, MixedPostsResponse, PostStub } from '@hive/common-hiveio-packages/wax';
import { getReadChain, getSearchReadChain } from './chain';
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
import { listWithObserverVotes, withObserverVote } from './vote-free-posts';

/**
 * Request timeout of the similar-posts call. A cold HiveSense similar-posts query took a healthy node
 * up to ~9 s before its cache warmed, well past the read chain's per-attempt timeout.
 */
const SIMILAR_POSTS_TIMEOUT_MS = 15_000;

const isFullPost = (post: Entry | PostStub): post is Entry => !isHiveSenseStub(post);

/**
 * HiveSense's posts as the rest of the app reads them: each full post through `withObserverVote`, so
 * a vote-free one (`observer_vote`, no `active_votes`) and a full-vote one give the same viewer vote
 * state; stubs as they came.
 */
const withObserverVotes = (posts: MixedPostsResponse, observer: string): MixedPostsResponse =>
  posts.map((post) => (isFullPost(post) ? withObserverVote(post, observer) : post));

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
    return response && withObserverVotes(response, observer);
  } catch (error) {
    return logStandarizedError('searchPosts', error);
  }
};

interface ISimilarPostsParams {
  author: string;
  permlink: string;
  truncate?: number;
  result_limit?: number;
  full_posts?: number;
  observer: string;
}

const readHiveSenseSimilarPosts = async ({
  author,
  permlink,
  truncate = 100,
  result_limit = 100,
  full_posts = 10,
  observer
}: ISimilarPostsParams): Promise<MixedPostsResponse | null> => {
  const chain = getReadChain().withTimeout(SIMILAR_POSTS_TIMEOUT_MS);
  const response = await chain.restApi['hivesense-api'].posts.author.permlink.similar({
    author,
    permlink,
    truncate,
    result_limit,
    full_posts,
    observer
  });
  return response && withObserverVotes(response, observer);
};

/** Which index ranked a similar-posts list: HiveSense's embeddings, or hivemind's BM25 text index. */
export type SimilarPostsSource = 'hivesense' | 'text';

export interface ISimilarPosts {
  source: SimilarPostsSource;
  posts: MixedPostsResponse;
}

// Asked of each node once, like a reader's search: a node without find_similar must not move other calls off it.
const readTextSimilarPosts = async ({
  author,
  permlink,
  result_limit = 100,
  observer
}: ISimilarPostsParams): Promise<Entry[] | null> => {
  try {
    const posts = await getSearchReadChain().api['search-api'].find_similar({
      author,
      permlink,
      limit: result_limit,
      observer
    });
    return listWithObserverVotes(posts, observer);
  } catch (error) {
    // Older hivemind answers "unknown method"; suggestions are optional either way.
    logger.warn(error, 'search-api.find_similar failed, showing no suggestions');
    return null;
  }
};

/**
 * Posts similar to @author/permlink: HiveSense's when `hiveSenseAvailable` and its call succeeds,
 * else hivemind's `search-api.find_similar` (`source: 'text'`). A post HiveSense has no embedding
 * for is not a HiveSense failure and gets no fallback. `null` when there are none or both failed
 * (logged as warnings). Never rejects.
 */
export const getSimilarPosts = async ({
  hiveSenseAvailable,
  ...params
}: ISimilarPostsParams & { hiveSenseAvailable: boolean }): Promise<ISimilarPosts | null> => {
  if (hiveSenseAvailable) {
    try {
      const posts = await readHiveSenseSimilarPosts(params);
      return posts ? { source: 'hivesense', posts } : null;
    } catch (error) {
      if (isHiveSenseNoEmbeddingError(error)) return null;
      logger.warn(error, 'HiveSense similar posts failed, falling back to search-api.find_similar');
    }
  }
  const posts = await readTextSimilarPosts(params);
  return posts ? { source: 'text', posts } : null;
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
      return listWithObserverVotes(
        response.filter((post): post is Entry => isRenderableSearchEntry(post)),
        observer
      );
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

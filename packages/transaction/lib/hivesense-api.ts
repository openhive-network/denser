import { logger } from '@ui/lib/logger';
import { Entry, MixedPostsResponse, PostStub } from '@hive/common-hiveio-packages/wax';
import { getChain } from './chain';
import {
  AI_SEARCH_REQUEST_TIMEOUT_MS,
  HIVE_SENSE_PROBE_TIMEOUT_MS,
  hiveSenseOpenApiLooksHealthy,
  hiveSenseSearchProbeLooksHealthy,
  isHiveSenseStub,
  isRenderableSearchEntry,
  promiseWithTimeout
} from './hivesense-search';

const logStandarizedError = (methodName: string, error: unknown): null => {
  logger.error(error, `Error in ${methodName}`);
  throw new Error(`Error in ${methodName}`);
};

export const getHiveSenseStatus = async (): Promise<boolean> => {
  try {
    const chain = await getChain();
    const base = String(chain.restApi['hivesense-api'].endpointUrl).replace(/\/$/, '');
    // The OpenAPI document is served only at the trailing-slash root, which the
    // wax REST caller cannot request (it filters out empty path segments).
    // A live spec is not enough: also probe posts/search so a degraded
    // sub-endpoint disables AI mode instead of hanging the search page (#947).
    const signal = AbortSignal.timeout(HIVE_SENSE_PROBE_TIMEOUT_MS);
    const probeUrl = new URL(`${base}/hivesense-api/posts/search`);
    probeUrl.searchParams.set('q', 'hive');
    probeUrl.searchParams.set('truncate', '1');
    probeUrl.searchParams.set('result_limit', '1');
    probeUrl.searchParams.set('full_posts', '0');

    const [rootResponse, probeResponse] = await Promise.all([
      fetch(`${base}/hivesense-api/`, { signal }),
      fetch(probeUrl, { signal })
    ]);
    if (!rootResponse.ok || !probeResponse.ok) return false;
    const spec = await rootResponse.json();
    const probeBody = await probeResponse.json();
    return (
      hiveSenseOpenApiLooksHealthy(spec) && hiveSenseSearchProbeLooksHealthy(probeResponse.ok, probeBody)
    );
  } catch (error) {
    logger.error(error, 'Error in getHiveSenseStatus');
    return false;
  }
};

// New API functions using the updated endpoints

export const searchPosts = async ({
  query,
  truncate = 100,
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
    const chain = await getChain();
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
    const chain = await getChain();
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
    return logStandarizedError('getSimilarPostsByPost', error);
  }
};

export const getPostsByIds = async ({
  posts,
  truncate = 100,
  observer
}: {
  posts: Array<{ author: string; permlink: string }>;
  truncate?: number;
  observer: string;
}): Promise<Entry[] | null> => {
  try {
    const chain = await getChain();
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

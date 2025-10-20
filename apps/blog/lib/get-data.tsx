import env from '@beam-australia/react-env';
import { Entry, PostStub, MixedPostsResponse } from '@transaction/lib/extended-hive.chain';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { configuredAIDomain } from '@ui/config/public-vars';
import { logger } from '@ui/lib/logger';

const chain = await hiveChainService.getHiveChain();

const logStandarizedError = (methodName: string, error: unknown): null => {
  logger.error(`Error in ${methodName}`, error);
  throw new Error(`Error in ${methodName}`);
};

export const getSimilarPosts = async ({
  pattern,
  tr_body = 100,
  limit = 50,
  observer,
  start_author,
  start_permlink
}: {
  pattern: string;
  tr_body?: number;
  limit?: number;
  observer: string;
  start_author: string;
  start_permlink: string;
}): Promise<Entry[] | null> => {
  try {
    const response = await chain.restApi['hivesense-api'].similarposts({
      posts_limit: limit,
      tr_body,
      pattern,
      observer,
      start_author,
      start_permlink
    });
    return response;
  } catch (error) {
    return logStandarizedError('getSimilarPosts', error);
  }
};

export const getSuggestions = async ({
  author,
  permlink,
  tr_body = 100,
  posts_limit = 5,
  observer
}: {
  author: string;
  permlink: string;
  tr_body?: number;
  posts_limit?: number;
  observer: string;
}): Promise<Entry[] | null> => {
  try {
    // Use the new endpoint format: /posts/{author}/{permlink}/similar
    const baseUrl = (chain.restApi['hivesense-api'].endpointUrl || chain.endpointUrl).replace(/\/$/, '');

    const params = new URLSearchParams({
      truncate: tr_body.toString(),
      result_limit: posts_limit.toString(),
      full_posts: posts_limit.toString(), // For suggestions, we want all results as full posts
      observer
    });

    const url = `${baseUrl}/hivesense-api/posts/${encodeURIComponent(author)}/${encodeURIComponent(permlink)}/similar?${params}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // The new endpoint returns MixedPostsResponse, but getSuggestions expects Entry[]
    // Extract just the full posts array
    return Array.isArray(data) ? data : data.posts || data;
  } catch (error) {
    return logStandarizedError('getSuggestions', error);
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
    // Use the new endpoint format: /posts/{author}/{permlink}/similar
    const baseUrl = (chain.restApi['hivesense-api'].endpointUrl || chain.endpointUrl).replace(/\/$/, '');

    const params = new URLSearchParams({
      truncate: truncate.toString(),
      result_limit: result_limit.toString(),
      full_posts: full_posts.toString(),
      observer
    });

    const url = `${baseUrl}/hivesense-api/posts/${encodeURIComponent(author)}/${encodeURIComponent(permlink)}/similar?${params}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    return logStandarizedError('getSimilarPostsByPost', error);
  }
};

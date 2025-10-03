import { hiveChainService } from './hive-chain-service';
import { logger } from '@ui/lib/logger';
import { Entry, MixedPostsResponse, PostStub } from './extended-hive.chain';

const chain = hiveChainService.getHiveChain();

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
    const response = await (
      await chain
    ).restApi['hivesense-api'].similarposts({
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

export const getHiveSenseStatus = async (): Promise<boolean> => {
  try {
    const response = await (await chain).restApi['hivesense-api']();
    return response.info.title === 'Hivesense';
  } catch (error) {
    return !!logStandarizedError('getHiveSenseStatus', error);
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
    const baseUrl = (await chain).restApi['hivesense-api'].endpointUrl || (await chain).endpointUrl;

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
    const response = (await chain).restApi['hivesense-api']['posts/search']({
      q: query,
      truncate,
      result_limit,
      full_posts,
      observer
    });
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
    // Use the new endpoint format: /posts/{author}/{permlink}/similar
    const baseUrl = (await chain).restApi['hivesense-api'].endpointUrl || (await chain).endpointUrl;

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
    // Use POST endpoint to handle more than 10 posts (up to 50)
    const baseUrl = (await chain).restApi['hivesense-api'].endpointUrl || (await chain).endpointUrl;

    const url = `${baseUrl}/hivesense-api/posts/by-ids`;

    const requestBody = {
      posts,
      truncate,
      observer
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Filter out null or invalid posts before returning
    if (Array.isArray(data)) {
      return data.filter((post) => post && (post as Entry).post_id);
    }
    return data;
  } catch (error) {
    return logStandarizedError('getPostsByIds', error);
  }
};

// Helper function to check if a post is a stub (only has author/permlink)
export const isPostStub = (post: Entry | PostStub): post is PostStub => {
  return !('title' in post) && !('body' in post) && 'author' in post && 'permlink' in post;
};

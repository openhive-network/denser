import env from '@beam-australia/react-env';
import { Entry, PostStub, MixedPostsResponse } from '@transaction/lib/extended-hive.chain';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { configuredAIDomain } from '@ui/config/public-vars';
import { logger } from '@ui/lib/logger';

const chain = await hiveChainService.getHiveChain();

const logStandarizedError = (methodName: string, error: unknown): null => {
    logger.error(`Error in ${methodName}`, error);
    throw new Error(`Error in ${methodName}`);
}

export const getHiveSenseStatus = async (): Promise<boolean> => {
  try {
    const response = await chain.restApi['hivesense-api']();
    return response.info.title === "Hivesense";
  } catch (error) {
    return !!logStandarizedError("getHiveSenseStatus", error);
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
    const response = await chain.restApi['hivesense-api'].posts.search({
      q: query,
      truncate,
      result_limit,
      full_posts,
      observer
    });
    return response;
  } catch (error) {
    return logStandarizedError("searchPosts", error);
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
    const response = await chain.restApi['hivesense-api'].posts.author.permlink.similar({author, permlink, truncate, result_limit, full_posts, observer})
    return response;
  } catch (error) {
    return logStandarizedError("getSimilarPostsByPost", error);
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
    const response = await chain.restApi['hivesense-api'].posts.byIds({
      posts,
      truncate,
      observer
    })

    if (Array.isArray(response)) {
      return response.filter(post => post && (post as Entry).post_id);
    }
    return response;
  } catch (error) {
    return logStandarizedError("getPostsByIds", error);
  }
};

// Helper function to check if a post is a stub (only has author/permlink)
export const isPostStub = (post: Entry | PostStub): post is PostStub => {
  return !('title' in post) && !('body' in post) && 'author' in post && 'permlink' in post;
};

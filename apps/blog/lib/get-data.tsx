import env from '@beam-australia/react-env';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { configuredAIDomain } from '@ui/config/public-vars';
import { logger } from '@ui/lib/logger';

const chain = await hiveChainService.getHiveChain();

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
    const response = await chain.restApi['hivesense-api'].similarposts({posts_limit: limit, tr_body, pattern, observer, start_author, start_permlink})
    return response;
  } catch (error) {
    logger.error('Error in getSimilarPosts', error);
    throw new Error('Error in getSimilarPosts');
  }
};

// FIXME: Source of data should use Wax not direct hivesense API call via fetch
export const getHiveSenseStatus = async (): Promise<boolean> => {
  try {
    const response = await chain.restApi['hivesense-api']();
    return response.info.title === "Hivesense";
  } catch (error) {
    logger.error('Error in getStatus', error);
    throw new Error('Error in getSimilarPosts');
  }
};

export const getSuggestions = async ({
  author,
  permlink,
  tr_body = 0,
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
    const response = await chain.restApi['hivesense-api'].similarpostsbypost({author, tr_body, permlink, observer, posts_limit})
    return response;
  } catch (error) {
    logger.error('Error in getSuggestions', error);
    throw new Error('Error in getSuggestions');
  }
};

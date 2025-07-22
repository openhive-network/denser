import env from '@beam-australia/react-env';
import { Entry } from '@transaction/lib/extended-hive.chain';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import { configuredAIDomain } from '@ui/config/public-vars';
import { logger } from '@ui/lib/logger';

const chain = await hiveChainService.getHiveChain();

const logStandarizedError = (methodName: string, error: unknown): null => {
    logger.error(`Error in ${methodName}`, error);
    throw new Error(`Error in ${methodName}`);
}

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
    return logStandarizedError("getSimilarPosts", error);
  }
};

// FIXME: Source of data should use Wax not direct hivesense API call via fetch
export const getHiveSenseStatus = async (): Promise<boolean> => {
  try {
    const response = await chain.restApi['hivesense-api']();
    return response.info.title === "Hivesense";
  } catch (error) {
    return !!logStandarizedError("getHiveSenseStatus", error);
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
    return logStandarizedError("getSuggestions", error);
  }
};

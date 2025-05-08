import env from '@beam-australia/react-env';
import { Entry } from '@transaction/lib/bridge';
import { logger } from '@ui/lib/logger';

const apiDevOrigin = env('AI_DOMAIN') || process.env.AI_DOMAIN;

export const getSimilarPosts = async ({
  pattern,
  tr_body = 100,
  limit = 50,
  observer
}: {
  pattern: string;
  tr_body?: number;
  limit?: number;
  observer: string;
}): Promise<Entry[] | null> => {
  try {
    const response = await fetch(
      `${apiDevOrigin}/hivesense-api/similarposts?pattern=${encodeURIComponent(pattern)}&tr_body=${tr_body}&posts_limit=${limit}&observer=${observer}`
    );
    if (!response.ok) {
      throw new Error(`Similar posts API Error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error in getSimilarPosts', error);
    throw new Error('Error in getSimilarPosts');
  }
};

export const getHiveSenseStatus = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${apiDevOrigin}/hivesense-api/`);
    if (!response.ok) {
      return false;
    }
    return true;
  } catch {
    return false;
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
    const response = await fetch(
      `${apiDevOrigin}/hivesense-api/similarpostsbypost?author=${author}&permlink=${permlink}&tr_body=${tr_body}&posts_limit=${posts_limit}&observer=${observer}`
    );
    if (!response.ok) {
      throw new Error(`Similar posts API Error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error in getSuggestions', error);
    throw new Error('Error in getSuggestions');
  }
};

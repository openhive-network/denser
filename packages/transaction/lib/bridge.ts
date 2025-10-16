import { hiveChainService } from './hive-chain-service';
import { getLogger } from '@ui/lib/logging';
import {
  IFollowList,
  IAccountRelationship,
  Entry,
  Community,
  IAccountNotification,
  FollowListType
} from './extended-hive.chain';

const logger = getLogger('app');

const chain = await hiveChainService.getHiveChain();

export type Subscription = Array<string>;

export const DATA_LIMIT = 20;

export const getDiscussion = async (
  author: string,
  permlink: string,
  observer?: string
): Promise<Record<string, Entry> | null> => {
  return chain.api.bridge.get_discussion({
    author,
    permlink,
    observer
  });
};

export const normalizePost = async (post: Entry): Promise<Entry | null> => {
  return chain.api.bridge.normalize_post({
    post
  });
};

export const getRelationshipBetweenAccounts = async (
  follower: string,
  following: string
): Promise<IAccountRelationship | null> => {
  return chain.api.bridge.get_relationship_between_accounts([follower, following]);
};

export type TwitterInfo = {
  twitter_username: string;
  twitter_profile: string;
};

export interface SearchResponse {
  took: number;
  hits: number;
  results: SearchResult[];
  scroll_id: string;
}

export interface SearchResult {
  id: number;
  author: string;
  permlink: string;
  category: string;
  children: number;
  author_rep: string;
  author_reputation: string;
  title: string;
  title_marked: string | null;
  body: string;
  body_marked: string | null;
  img_url: string;
  payout: number;
  total_votes: number;
  up_votes: number;
  created_at: string;
  created: string;
  tags: string[];
  json_metadata: {
    tags: string[];
  };
  app: string;
  depth: number;
}

export const getSearch = async (q: string, scroll_id: string, sort: string): Promise<SearchResponse> => {
  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify({ q, scroll_id, sort }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Search API Error: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error('Error in /search api call');
  }
};

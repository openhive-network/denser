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

const resolvePost = (post: Entry, observer: string): Promise<Entry> => {
  const { json_metadata: json } = post;

  if (json.original_author && json.original_permlink && json.tags && json.tags[0] === 'cross-post') {
    return getPost(json.original_author, json.original_permlink, observer)
      .then((resp) => {
        if (resp) {
          return {
            ...post,
            original_entry: resp
          };
        }

        return post;
      })
      .catch(() => {
        return post;
      });
  }

  return new Promise((resolve) => {
    resolve(post);
  });
};

const resolvePosts = (posts: Entry[], observer: string): Promise<Entry[]> => {
  const promises = posts.map((p) => resolvePost(p, observer));

  return Promise.all(promises);
};

export const getPostsRanked = async (
  sort: string,
  tag: string = '',
  start_author: string = '',
  start_permlink: string = '',
  observer: string,
  limit: number = DATA_LIMIT
): Promise<Entry[] | null> => {
  return chain.api.bridge
    .get_ranked_posts({
      sort,
      start_author,
      start_permlink,
      limit,
      tag,
      observer
    })
    .then((resp) => {
      // logger.info('getPostsRanked result: %o', resp);
      if (resp) {
        return resolvePosts(resp, observer);
      }

      return resp;
    });
};

export const getAccountPosts = async (
  sort: string,
  account: string,
  observer: string,
  start_author: string = '',
  start_permlink: string = '',
  limit: number = DATA_LIMIT
): Promise<Entry[] | null> => {
  return chain.api.bridge
    .get_account_posts({
      sort,
      account,
      start_author,
      start_permlink,
      limit,
      observer
    })
    .then((resp) => {
      if (resp) {
        return resolvePosts(resp, observer);
      }

      return resp;
    });
};

export const getPost = async (
  author: string = '',
  permlink: string = '',
  observer: string = ''
): Promise<Entry | null> => {
  return chain.api.bridge
    .get_post({
      author,
      permlink,
      observer
    })
    .then((resp) => {
      if (resp) {
        return resolvePost(resp, observer);
      }

      return resp;
    });
};

// I have problem with this func, I pass good account name but RPC call it with empty string
export const getAccountNotifications = async (
  account: string,
  lastId: number | null = null,
  limit = 50
): Promise<IAccountNotification[] | null> => {
  const params: { account: string; last_id?: number; limit: number } = {
    account,
    limit
  };

  if (lastId) {
    params.last_id = lastId;
  }
  return chain.api.bridge.account_notifications(params);
};

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

export const getCommunity = async (
  name: string,
  observer: string | undefined = ''
): Promise<Community | null> => {
  return chain.api.bridge.get_community({ name, observer });
};

export const getListCommunityRoles = async (community: string): Promise<string[][] | null> => {
  return chain.api.bridge.list_community_roles({ community });
};

export const getCommunities = async (
  sort: string,
  query?: string | null,
  // last: string = '',
  // limit: number = 100,
  observer: string = 'hive.blog'
): Promise<Community[] | null> => {
  return chain.api.bridge.list_communities({
    // limit,
    query,
    sort,
    observer
  });
};

export const normalizePost = async (post: Entry): Promise<Entry | null> => {
  return chain.api.bridge.normalize_post({
    post
  });
};

export const getSubscriptions = async (account: string): Promise<string[][] | null> => {
  return chain.api.bridge.list_all_subscriptions({
    account
  });
};

export const getSubscribers = async (community: string): Promise<string[][] | null> => {
  return chain.api.bridge.list_subscribers({
    community
  });
};

export const getRelationshipBetweenAccounts = async (
  follower: string,
  following: string
): Promise<IAccountRelationship | null> => {
  return chain.api.bridge.get_relationship_between_accounts([follower, following]);
};

export const getFollowList = async (
  observer: string,
  follow_type: FollowListType
): Promise<IFollowList[]> => {
  return chain.api.bridge.get_follow_list({
    observer,
    follow_type
  });
};

export type TwitterInfo = {
  twitter_username: string;
  twitter_profile: string;
};

export const getTwitterInfo = async (username: string) => {
  const response = await fetch(`https://hiveposh.com/api/v0/twitter/${username}`);
  if (!response.ok) {
    throw new Error(`Posh API Error: ${response.status}`);
  }

  const data = await response.json();
  const { error } = data;
  if (error) {
    throw new Error(`Posh API Error: ${error}`);
  }

  return data;
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

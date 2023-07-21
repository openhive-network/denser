import { Client } from '@hiveio/dhive/lib/client';
import { siteConfig } from '@/config/site';
import { useQuery } from '@tanstack/react-query';

export interface EntryBeneficiaryRoute {
  account: string;
  weight: number;
}

export interface EntryVote {
  voter: string;
  rshares: number;
}

export interface EntryStat {
  flag_weight: number;
  gray: boolean;
  hide: boolean;
  total_votes: number;
  is_pinned?: boolean;
}

export interface JsonMetadata {
  author: string | undefined;
  tags?: string[];
  description?: string | null;
  app?: any;
  canonical_url?: string;
  format?: string;
  original_author?: string;
  original_permlink?: string;
}

export interface Entry {
  active_votes: EntryVote[];
  author: string;
  author_payout_value: string;
  author_reputation: number;
  author_role?: string;
  author_title?: string;
  beneficiaries: EntryBeneficiaryRoute[];
  blacklists: string[];
  body: string;
  category: string;
  children: number;
  community?: string;
  community_title?: string;
  created: string;
  total_votes?: number;
  curator_payout_value: string;
  depth: number;
  is_paidout: boolean;
  json_metadata: JsonMetadata;
  max_accepted_payout: string;
  net_rshares: number;
  parent_author?: string;
  parent_permlink?: string;
  payout: number;
  payout_at: string;
  pending_payout_value: string;
  percent_hbd: number;
  permlink: string;
  post_id: number;
  id?: number;
  promoted: string;
  reblogged_by?: string[] | any;
  replies: any[];
  stats?: EntryStat;
  title: string;
  updated: string;
  url: string;
  original_entry?: Entry;
}

export type CommunityTeam = Array<Array<string>>;

export interface Community {
  about: string;
  admins?: string[];
  avatar_url: string;
  created_at: string;
  description: string;
  flag_text: string;
  id: number;
  is_nsfw: boolean;
  lang: string;
  name: string;
  num_authors: number;
  num_pending: number;
  subscribers: number;
  sum_pending: number;
  settings?: any;
  team: CommunityTeam;
  title: string;
  type_id: number;
}

export type Communities = Community[];

export type Subscription = Array<string>;

export const dataLimit = 20;

const endpoint =
  typeof window !== 'undefined'
    ? window.localStorage.getItem('hive-blog-endpoint')
      ? JSON.parse(String(window.localStorage.getItem('hive-blog-endpoint')))
      : siteConfig.endpoint
    : siteConfig.endpoint;

export const bridgeServer = new Client([`${endpoint}`], {
  timeout: 3000,
  failoverThreshold: 3,
  consoleOnFailover: true
});

const bridgeApiCall = <T>(endpoint: string, params: {}): Promise<T> =>
  bridgeServer.call('bridge', endpoint, params);

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

export const getPostsRanked = (
  sort: string,
  tag: string = '',
  start_author: string = '',
  start_permlink: string = '',
  limit: number = dataLimit,
  observer: string = ''
): Promise<Entry[] | null> => {
  return bridgeApiCall<Entry[] | null>('get_ranked_posts', {
    sort,
    start_author,
    start_permlink,
    limit,
    tag,
    observer
  }).then((resp) => {
    if (resp) {
      return resolvePosts(resp, observer);
    }

    return resp;
  });
};

export const getAccountPosts = (
  sort: string,
  account: string,
  observer: string,
  start_author: string = '',
  start_permlink: string = '',
  limit: number = dataLimit
): Promise<Entry[] | null> => {
  return bridgeApiCall<Entry[] | null>('get_account_posts', {
    sort,
    account,
    start_author,
    start_permlink,
    limit,
    observer
  }).then((resp) => {
    if (resp) {
      return resolvePosts(resp, observer);
    }

    return resp;
  });
};

export const getPost = (
  author: string = '',
  permlink: string = '',
  observer: string = ''
): Promise<Entry | null> => {
  return bridgeApiCall<Entry | null>('get_post', {
    author,
    permlink,
    observer
  }).then((resp) => {
    if (resp) {
      return resolvePost(resp, observer);
    }

    return resp;
  });
};

export interface AccountNotification {
  date: string;
  id: number;
  msg: string;
  score: number;
  type: string;
  url: string;
}

// I have problem with this func, I pass good account name but RPC call it with empty string
export const getAccountNotifications = (
  account: string,
  lastId: number | null = null,
  limit = 50
): Promise<AccountNotification[] | null> => {
  const params: { account: string; last_id?: number; limit: number } = {
    account,
    limit
  };

  if (lastId) {
    params.last_id = lastId;
  }

  return bridgeApiCall<AccountNotification[] | null>('account_notifications', params);
};

export const getDiscussion = (author: string, permlink: string): Promise<Record<string, Entry> | null> =>
  bridgeApiCall<Record<string, Entry> | null>('get_discussion', {
    author,
    permlink
  });

export const getCommunity = (name: string, observer: string | undefined = ''): Promise<Community | null> =>
  bridgeApiCall<Community | null>('get_community', { name, observer });

export const getCommunities = (
  sort: string,
  query?: string | null,
  last: string = '',
  limit: number = 100,
  observer: string = ''
): Promise<Community[] | null> =>
  bridgeApiCall<Community[] | null>('list_communities', {
    last,
    limit,
    query,
    sort,
    observer
  });

export const normalizePost = (post: any): Promise<Entry | null> =>
  bridgeApiCall<Entry | null>('normalize_post', {
    post
  });

export const getSubscriptions = (account: string): Promise<Subscription[] | null> =>
  bridgeApiCall<Subscription[] | null>('list_all_subscriptions', {
    account
  });

export const getSubscribers = (community: string): Promise<Subscription[] | null> =>
  bridgeApiCall<Subscription[] | null>('list_subscribers', {
    community
  });

export interface AccountRelationship {
  follows: boolean;
  ignores: boolean;
  is_blacklisted: boolean;
  follows_blacklists: boolean;
}

export const getRelationshipBetweenAccounts = (
  follower: string,
  following: string
): Promise<AccountRelationship | null> =>
  bridgeApiCall<AccountRelationship | null>('get_relationship_between_accounts', [follower, following]);

export interface BasicPostInfo {
  author: string;
  permlink: string;
  category: string;
  depth: number;
}

export const getPostHeader = (author: string, permlink: string): Promise<BasicPostInfo> =>
  bridgeApiCall<BasicPostInfo>('get_post_header', {
    author,
    permlink
  });

export interface FollowList {
  name: '';
  blacklist_description: '';
  muted_list_description: '';
}
export type FollowListType = 'follow_blacklist' | 'follow_muted' | 'blacklisted' | 'muted';

export const getFollowList = (observer: string, follow_type: FollowListType): Promise<FollowList> =>
  bridgeApiCall<FollowList>('get_follow_list', {
    observer,
    follow_type
  });

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

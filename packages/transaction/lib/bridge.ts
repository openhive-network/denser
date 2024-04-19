import { TWaxApiRequest } from '@hive/wax';
import { hiveChainService } from './hive-chain-service';

const chain = await hiveChainService.getHiveChain();

interface IGetPostHeader {
  author: string;
  permlink: string;
  category: string;
  depth: number;
}

interface IGetPostHeaderParams {
  author: string;
  permlink: string;
}

type GetPostHeaderData = {
  bridge: {
    get_post_header: TWaxApiRequest<IGetPostHeaderParams, IGetPostHeader>;
  };
};

export const getPostHeader = async (author: string, permlink: string): Promise<IGetPostHeader> => {
  return chain.extend<GetPostHeaderData>().api.bridge.get_post_header({
    author,
    permlink
  });
};

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

export type Badge = {
  name: string;
  state: string;
  type: string;
  id: string;
  title: string;
  url: string;
};

export interface JsonMetadata {
  image: string;
  links?: string[];
  flow?: {
    pictures: {
      caption: string;
      id: number;
      mime: string;
      name: string;
      tags: string[];
      url: string;
    }[];
    tags: string[];
  };
  images: string[];
  author: string | undefined;
  tags?: string[];
  description?: string | null;
  app?: string;
  canonical_url?: string;
  format?: string;
  original_author?: string;
  original_permlink?: string;
  summary?: string;
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
  reblogged_by?: string[];
  replies: Array<unknown>;
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
  settings?: object;
  team: CommunityTeam;
  title: string;
  type_id: number;
  context: {
    role: string;
    subscribed: Boolean;
    title: string;
  };
}

export type Communities = Community[];

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

interface IGetPostsRanked {
  sort: string;
  tag: string;
  start_author: string;
  start_permlink: string;
  limit: number;
  observer: string;
}

type GetPostsRankedData = {
  bridge: {
    get_ranked_posts: TWaxApiRequest<IGetPostsRanked, Entry[] | null>;
  };
};

export const getPostsRanked = async (
  sort: string,
  tag: string = '',
  start_author: string = '',
  start_permlink: string = '',
  observer: string,
  limit: number = DATA_LIMIT
): Promise<Entry[] | null> => {
  return chain
    .extend<GetPostsRankedData>()
    .api.bridge.get_ranked_posts({
      sort,
      start_author,
      start_permlink,
      limit,
      tag,
      observer
    })
    .then((resp) => {
      if (resp) {
        return resolvePosts(resp, observer);
      }

      return resp;
    });
};

interface IGetAccountPosts {
  sort: string;
  account: string;
  start_author: string;
  start_permlink: string;
  limit: number;
  observer: string;
}

type GetAccountPostsData = {
  bridge: {
    get_account_posts: TWaxApiRequest<IGetAccountPosts, Entry[] | null>;
  };
};

export const getAccountPosts = async (
  sort: string,
  account: string,
  observer: string,
  start_author: string = '',
  start_permlink: string = '',
  limit: number = DATA_LIMIT
): Promise<Entry[] | null> => {
  return chain
    .extend<GetAccountPostsData>()
    .api.bridge.get_account_posts({
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

interface IGetPost {
  author: string;
  permlink: string;
  observer: string;
}

type GetPostData = {
  bridge: {
    get_post: TWaxApiRequest<IGetPost, Entry | null>;
  };
};

export const getPost = async (
  author: string = '',
  permlink: string = '',
  observer: string = ''
): Promise<Entry | null> => {
  return chain
    .extend<GetPostData>()
    .api.bridge.get_post({
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

interface IGetAccountNotifications {
  account: string;
  lastId?: number;
  limit: number;
}

export interface IAccountNotification {
  date: string;
  id?: number;
  msg: string;
  score: number;
  type: string;
  url: string;
}

export interface IAccountNotificationEx extends IAccountNotification {
  lastRead: number;
}

type GetAccountNotificationsData = {
  bridge: {
    account_notifications: TWaxApiRequest<IGetAccountNotifications, IAccountNotification[] | null>;
  };
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
  return chain.extend<GetAccountNotificationsData>().api.bridge.account_notifications(params);
};

interface IGetDiscussion {
  author: string;
  observer: string;
  permlink: string;
}

type GetDiscussionData = {
  bridge: {
    get_discussion: TWaxApiRequest<IGetDiscussion, Record<string, Entry> | null>;
  };
};

export const getDiscussion = async (
  author: string,
  observer: string,
  permlink: string
): Promise<Record<string, Entry> | null> => {
  return chain.extend<GetDiscussionData>().api.bridge.get_discussion({
    author,
    observer,
    permlink
  });
};

interface IGetCommunity {
  name: string;
  observer?: string;
}

type GetCommunityData = {
  bridge: {
    get_community: TWaxApiRequest<IGetCommunity, Community | null>;
  };
};

export const getCommunity = async (
  name: string,
  observer: string | undefined = ''
): Promise<Community | null> => {
  return chain.extend<GetCommunityData>().api.bridge.get_community({ name, observer });
};

interface IGetCommunities {
  sort: string;
  query?: string | null;
  observer: string;
}

type GetCommunitiesData = {
  bridge: {
    list_communities: TWaxApiRequest<IGetCommunities, Community[] | null>;
  };
};

export const getCommunities = async (
  sort: string,
  query?: string | null,
  // last: string = '',
  // limit: number = 100,
  observer: string = 'hive.blog'
): Promise<Community[] | null> => {
  return chain.extend<GetCommunitiesData>().api.bridge.list_communities({
    // limit,
    query,
    sort,
    observer
  });
};

interface IGetNormalizePost {
  post: Entry;
}

type GetNormalizePost = {
  bridge: {
    normalize_post: TWaxApiRequest<IGetNormalizePost, Entry | null>;
  };
};

export const normalizePost = async (post: Entry): Promise<Entry | null> => {
  return chain.extend<GetNormalizePost>().api.bridge.normalize_post({
    post
  });
};

interface IGetSubscriptions {
  account: string;
}

type GetSubscriptions = {
  bridge: {
    list_all_subscriptions: TWaxApiRequest<IGetSubscriptions, Subscription[] | null>;
  };
};

export const getSubscriptions = async (account: string): Promise<Subscription[] | null> => {
  return chain.extend<GetSubscriptions>().api.bridge.list_all_subscriptions({
    account
  });
};

interface IGetSubscribers {
  community: string;
}

type GetSubscribers = {
  bridge: {
    list_subscribers: TWaxApiRequest<IGetSubscribers, Subscription[] | null>;
  };
};

export const getSubscribers = async (community: string): Promise<Subscription[] | null> => {
  return chain.extend<GetSubscribers>().api.bridge.list_subscribers({
    community
  });
};

export interface IUnreadNotificationsParams {
  account: string;
}

export interface IUnreadNotifications {
  lastread: string;
  unread: number;
}

type GetUnreadNotifications = {
  bridge: {
    unread_notifications: TWaxApiRequest<IUnreadNotificationsParams, IUnreadNotifications | null>;
  };
};

export const getUnreadNotifications = async (account: string): Promise<IUnreadNotifications | null> => {
  return chain.extend<GetUnreadNotifications>().api.bridge.unread_notifications({
    account
  });
};

export interface IAccountRelationship {
  follows: boolean;
  ignores: boolean;
  is_blacklisted: boolean;
  follows_blacklists: boolean;
}

type GetAccountRelationship = {
  bridge: {
    get_relationship_between_accounts: TWaxApiRequest<string[], IAccountRelationship | null>;
  };
};

export const getRelationshipBetweenAccounts = async (
  follower: string,
  following: string
): Promise<IAccountRelationship | null> => {
  return chain
    .extend<GetAccountRelationship>()
    .api.bridge.get_relationship_between_accounts([follower, following]);
};

export type FollowListType = 'follow_blacklist' | 'follow_muted' | 'blacklisted' | 'muted';
export interface IFollowListParams {
  observer: string;
  follow_type: FollowListType;
}

export interface IFollowList {
  name: string;
  blacklist_description: string;
  muted_list_description: string;
}

type GetFollowListData = {
  bridge: {
    get_follow_list: TWaxApiRequest<IFollowListParams, IFollowList[]>;
  };
};

export const getFollowList = async (
  observer: string,
  follow_type: FollowListType
): Promise<IFollowList[]> => {
  return chain.extend<GetFollowListData>().api.bridge.get_follow_list({
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

import { Client } from "@hiveio/dhive";

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

export const bridgeServer = new Client(["https://api.hive.blog"], {
  timeout: 3000,
  failoverThreshold: 3,
  consoleOnFailover: true
});

const bridgeApiCall = <T>(endpoint: string, params: {}): Promise<T> =>
  bridgeServer.call("bridge", endpoint, params);

const resolvePost = (post: Entry, observer: string): Promise<Entry> => {
  const { json_metadata: json } = post;

  if (
    json.original_author &&
    json.original_permlink &&
    json.tags &&
    json.tags[0] === "cross-post"
  ) {
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
  sort: string =  "hot",
  start_author: string = "",
  start_permlink: string = "",
  limit: number = 11,
  tag: string = "",
  observer: string = ""
): Promise<Entry[] | null> => {
  return bridgeApiCall<Entry[] | null>("get_ranked_posts", {
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
  start_author: string = "",
  start_permlink: string = "",
  limit: number = 11,
  observer: string = ""
): Promise<Entry[] | null> => {
  return bridgeApiCall<Entry[] | null>("get_account_posts", {
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
  author: string = "",
  permlink: string = "",
  observer: string = ""
): Promise<Entry | null> => {
  return bridgeApiCall<Entry | null>("get_post", {
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

  return bridgeApiCall<AccountNotification[] | null>("account_notifications", params);
};

export const getDiscussion = (
  author: string,
  permlink: string
): Promise<Record<string, Entry> | null> =>
  bridgeApiCall<Record<string, Entry> | null>("get_discussion", {
    author,
    permlink
  });

export const normalizePost = (post: any): Promise<Entry | null> =>
  bridgeApiCall<Entry | null>("normalize_post", {
    post
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
  bridgeApiCall<AccountRelationship | null>("get_relationship_between_accounts", [
    follower,
    following
  ]);

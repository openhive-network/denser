import { TWaxApiRequest } from '@hiveio/wax';

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
export interface IFollowList {
  name: string;
  blacklist_description: string;
  muted_list_description: string;
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
  team: string[][];
  title: string;
  type_id: number;
  context: {
    role: string;
    subscribed: Boolean;
    title: string;
  };
}

export type FollowListType = 'follow_blacklist' | 'follow_muted' | 'blacklisted' | 'muted';

export interface IFollowList {
  name: string;
  blacklist_description: string;
  muted_list_description: string;
}

export type ExtendedNodeApi = {
  bridge: {
    get_post_header: TWaxApiRequest<
      { author: string; permlink: string; category: string; depth: number },
      { author: string; permlink: string }
    >;
    get_ranked_posts: TWaxApiRequest<
      {
        sort: string;
        tag: string;
        start_author: string;
        start_permlink: string;
        limit: number;
        observer: string;
      },
      Entry[] | null
    >;
  };
  get_account_posts: TWaxApiRequest<
    {
      sort: string;
      account: string;
      start_author: string;
      start_permlink: string;
      limit: number;
      observer: string;
    },
    Entry[] | null
  >;
  get_post: TWaxApiRequest<{ author: string; permlink: string; observer: string }, Entry | null>;
  account_notifications: TWaxApiRequest<
    { date: string; id?: number; msg: string; score: number; type: string; url: string },
    { lastRead: number }[] | null
  >;
  get_discussion: TWaxApiRequest<
    { author: string; permlink: string; observer?: string },
    Record<string, Entry> | null
  >;
  get_community: TWaxApiRequest<{ name: string; observer?: string }, Community | null>;
  list_community_roles: TWaxApiRequest<{ community: string }, string[][] | null>;
  list_communities: TWaxApiRequest<
    { sort: string; query?: string | null; observer: string },
    Community[] | null
  >;
  normalize_post: TWaxApiRequest<{ post: Entry }, Entry | null>;
  list_all_subscriptions: TWaxApiRequest<{ account: string }, string[][] | null>;
  list_subscribers: TWaxApiRequest<{ community: string }, string[][] | null>;
  unread_notifications: TWaxApiRequest<{ account: string }, { lastread: string; unread: number } | null>;
  get_relationship_between_accounts: TWaxApiRequest<
    string[],
    { follows: boolean; ignores: boolean; is_blacklisted: boolean; follows_blacklists: boolean } | null
  >;
  get_follow_list: TWaxApiRequest<{ observer: string; follow_type: FollowListType }, IFollowList[]>;
};

import {
  TWaxApiRequest,
  RcAccount,
  GetDynamicGlobalPropertiesResponse,
  GetDynamicGlobalPropertiesRequest,
  asset,
  NaiAsset
} from '@hiveio/wax';
import { AccountFollowStats, AccountProfile, FullAccount } from './app-types';

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

export interface IMarketStatistics {
  hbd_volume: string;
  highest_bid: string;
  hive_volume: string;
  latest: string;
  lowest_ask: string;
  percent_change: string;
}

export interface IWitness {
  created: string;
  id: number;
  total_missed: number;
  url: string;
  props: {
    account_creation_fee: string;
    account_subsidy_budget: number;
    maximum_block_size: number;
  };
  hbd_exchange_rate: {
    base: string;
    quote: string;
  };
  available_witness_account_subsidies: number;
  running_version: string;
  owner: string;
  signing_key: string;
  last_hbd_exchange_update: string;
  votes: number;
  last_confirmed_block_num: number;
}

export interface IOrdersDataItem {
  created: string;
  hbd: number;
  hive: number;
  order_price: {
    base: string;
    quote: string;
  };
  real_price: string;
}
export interface IOrdersData {
  bids: IOrdersDataItem[];
  asks: IOrdersDataItem[];
  trading: IOrdersDataItem[];
}

export interface IOpenOrdersData {
  id: number;
  created: string;
  expiration: string;
  seller: string;
  orderid: number;
  for_sale: number;
  sell_price: {
    base: string;
    quote: string;
  };
  real_price: string;
  rewarded: boolean;
}

export interface IRecentTradesData {
  date: string;
  current_pays: string;
  open_pays: string;
}

type OwnerHistory = {
  account: string;
  id: number;
  last_valid_time: string;
  previous_owner_authority: {
    account_auths: unknown[];
    key_auths: [string, number][];
    weight_threshold: number;
  };
}[];

export interface IGetProposalsParams {
  start: Array<number | string>;
  limit: number;
  order: 'by_creator' | 'by_total_votes' | 'by_start_date' | 'by_end_date';
  order_direction: 'descending' | 'ascending';
  status: 'all' | 'inactive' | 'active' | 'votable' | 'expired';
  last_id?: number;
}

export interface IProposal {
  creator: string;
  daily_pay: {
    amount: string;
    nai: string;
    precision: number;
  };
  end_date: string;
  id: number;
  permlink: string;
  proposal_id: number;
  receiver: string;
  start_date: string;
  status: string;
  subject: string;
  total_votes: string;
}

export type SavingsWithdrawals = {
  withdrawals: {
    amount: asset;
    complete: Date;
    from: string;
    id: number;
    memo: string;
    request_id: number;
    to: string;
  }[];
};

export interface IPost {
  active_votes: {
    rshares: number;
    voter: string;
  };
  author: string;
  author_payout_value: string;
  author_reputation: number;
  author_role: string;
  author_title: string;
  beneficiaries: Array<unknown>;
  blacklists: Array<unknown>;
  body: string;
  category: string;
  children: number;
  community: string;
  community_title: string;
  created: string;
  curator_payout_value: string;
  depth: number;
  is_paidout: boolean;
  json_metadata: {
    app: string;
    description: string;
    format: string;
    image: [string];
    tags: string[];
    users: Array<unknown>;
  };
  max_accepted_payout: string;
  net_rshares: number;
  payout: number;
  payout_at: string;
  pending_payout_value: string;
  percent_hbd: number;
  permlink: string;
  post_id: number;
  promoted: string;
  replies: Array<unknown>;
  stats: {
    flag_weight: number;
    gray: boolean;
    hide: boolean;
    total_votes: number;
  };
  title: string;
  updated: string;
  url: string;
}

export interface IVote {
  percent: number;
  reputation: number;
  rshares: string;
  time: string;
  timestamp?: number;
  voter: string;
  weight: number;
  reward?: number;
}

export interface BlogEntry {
  blog: string;
  entry_id: number;
  author: string;
  permlink: string;
  reblogged_on: string;
}

export interface IWitnessSchedule {
  id: number;
  current_virtual_time: string;
  next_shuffle_block_num: number;
  current_shuffled_witnesses: string[];
  num_scheduled_witnesses: number;
  top19_weight: number;
  timeshare_weight: number;
  miner_weight: number;
  witness_pay_normalization_factor: number;
  median_props: {
    account_creation_fee: string;
    maximum_block_size: number;
    hbd_interest_rate: number;
  };
  majority_version: string;
  max_voted_witnesses: number;
  max_miner_witnesses: number;
  max_runner_witnesses: number;
  hardfork_required_witnesses: number;
}

export interface IFeedHistory {
  current_median_history: {
    base: NaiAsset;
    quote: NaiAsset;
  };
  price_history: [
    {
      base: NaiAsset;
      quote: NaiAsset;
    }
  ];
}

export interface IRewardFund {
  recent_claims: string;
  reward_balance: string;
}

export interface WithdrawRoute {
  auto_vest: boolean;
  from_account: string;
  id: number;
  percent: number;
  to_account: string;
}

export interface IConversionRequest {
  amount: string;
  conversion_date: string;
  id: number;
  owner: string;
  requestid: number;
}

export interface SavingsWithdrawRequest {
  id: number;
  from: string;
  to: string;
  memo: string;
  request_id: number;
  amount: string;
  complete: string;
}

class VerifySignaturesRequest {
  hash!: string;
  signatures!: string[];
  required_other!: string[];
  required_active!: string[];
  required_owner!: string[];
  required_posting!: string[];
}

class VerifySignaturesResponse {
  public valid!: boolean;
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
  condenser_api: {
    get_witnesses_by_vote: TWaxApiRequest<(string | number)[], IWitness[]>;
    get_ticker: TWaxApiRequest<void[], IMarketStatistics>;
    get_order_book: TWaxApiRequest<number[], IOrdersData>;
    get_open_orders: TWaxApiRequest<string[], IOpenOrdersData[]>;
    get_trade_history: TWaxApiRequest<(string | number)[], IOrdersDataItem[]>;
    get_recent_trades: TWaxApiRequest<number[], IRecentTradesData[]>;
    get_owner_history: TWaxApiRequest<string[], OwnerHistory>;
    get_follow_count: TWaxApiRequest<string[], AccountFollowStats>;
    get_content: TWaxApiRequest<string[], IPost>;
    get_market_history_buckets: TWaxApiRequest<void[], number[]>;
    get_active_votes: TWaxApiRequest<string[], IVote[]>;
    get_blog_entries: TWaxApiRequest<(string | number)[], BlogEntry[]>;
    get_reblogged_by: TWaxApiRequest<[string, string], string[]>;
    get_witness_schedule: TWaxApiRequest<[], IWitnessSchedule>;
  };
  rc_api: {
    find_rc_accounts: TWaxApiRequest<string[], { rc_accounts: RcAccount[] }>;
  };
  database_api: {
    list_proposals: TWaxApiRequest<Partial<IGetProposalsParams>, { proposals: IProposal[] }>;
    find_savings_withdrawals: TWaxApiRequest<{ account: string }, SavingsWithdrawals>;
    get_dynamic_global_properties: TWaxApiRequest<
      GetDynamicGlobalPropertiesRequest,
      GetDynamicGlobalPropertiesResponse
    >;
    get_feed_history: TWaxApiRequest<void, IFeedHistory>;
    lookup_accounts: TWaxApiRequest<(string | number)[], string[]>;
    get_reward_fund: TWaxApiRequest<string[], IRewardFund>;
    get_withdraw_routes: TWaxApiRequest<string[], WithdrawRoute[]>;
    get_conversion_requests: TWaxApiRequest<string[], IConversionRequest[]>;
    get_savings_withdraw_from: TWaxApiRequest<string[], SavingsWithdrawRequest[]>;
    verify_signatures: {
      params: VerifySignaturesRequest;
      result: VerifySignaturesResponse;
    };
  };
};

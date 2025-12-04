import {
  TWaxApiRequest,
  RcAccount,
  GetDynamicGlobalPropertiesResponse,
  GetDynamicGlobalPropertiesRequest,
  type asset as AssetType,
  NaiAsset,
  transaction
} from '@hiveio/wax';
import { AccountFollowStats, FullAccount } from './app-types';
import { SearchType } from './hive-api';

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
  // added only when using optimistic update, not backend property
  _temporary?: boolean;
}
export interface IFollowList {
  name: string;
  blacklist_description: string;
  muted_list_description: string;
  //added only when using optimistic update, not backend property
  _temporary?: boolean;
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
  //added only when using optimistic update, not backend property
  _temporary?: boolean;
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
    //  added only when using optimistic update, not backend property
    _temporary?: boolean;
  };
  // added only when using optimistic update, not backend property
  _temporary?: boolean;
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

export type FollowListType = 'follow_blacklist' | 'followed_muted_lists' | 'blacklisted' | 'muted';

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

export type OwnerHistory = {
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
    amount: AssetType;
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
  rshares: number;
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

export class VerifySignaturesParams {
  hash!: string;
  signatures!: string[];
  required_other!: string[];
  required_active!: string[];
  required_owner!: string[];
  required_posting!: string[];
}

export class VerifySignaturesResponse {
  public valid!: boolean;
}

export interface IDelegatedVestingShare {
  id: number;
  delegatee: string;
  delegator: string;
  min_delegation_time: string;
  vesting_shares: string;
}

export type OpType =
  | 'claim_reward_balance_operation'
  | 'transfer_operation'
  | 'transfer_from_savings_operation'
  | 'transfer_to_savings_operation'
  | 'interest_operation'
  | 'cancel_transfer_from_savings_operation'
  | 'fill_order_operation'
  | 'transfer_to_vesting_operation'
  | 'curation_reward_operation'
  | 'author_reward_operation'
  | 'producer_reward_operation'
  | 'comment_reward_operation'
  | 'comment_benefactor_reward_operation'
  | 'interest_operation'
  | 'proposal_pay_operation'
  | 'sps_fund_operation'
  | 'transfer_operation'
  | 'withdraw_vesting_operation';

export type IAuthorReward = {
  author: string;
  curators_vesting_payout: string;
  hbd_payout: string;
  hive_payout: string;
  payout_must_be_claimed: boolean;
  permlink: string;
  vesting_payout: string;
  author_rewards?: string;
  beneficiary_payout_value?: string;
  curator_payout_value?: string;
  payout?: string;
  reward?: string;
  total_payout_value?: string;
  curator?: string;
};
export type ICurationReward = {
  author_rewards: string;
  beneficiary_payout_value: string;
  curator_payout_value: string;
  payout: string;
  total_payout_value: string;
  reward: string;
  curator: string;
  author?: string;
  curators_vesting_payout?: string;
  hbd_payout?: string;
  hive_payout?: string;
  payout_must_be_claimed?: boolean;
  permlink?: string;
  vesting_payout?: string;
};

export interface HiveOperation {
  block: number;
  trx_id: string | null;
  op_pos: number;
  op_type_id: number;
  timestamp: Date;
  virtual_op: boolean;
  operation_id: number;
  trx_in_block: number;
  op: {
    type: string;
    value: {
      open_pays?: NaiAsset;
      current_pays?: NaiAsset;
      owner?: string;
      is_saved_into_hbd_balance?: boolean;
      interest: NaiAsset;
      request_id?: number;
      amount?: NaiAsset;
      from?: string;
      memo?: string;
      to?: string;
      account?: string;
      reward_hbd?: NaiAsset;
      reward_hive?: NaiAsset;
      reward_vests?: NaiAsset;
      vesting_shares?: string;
      author?: string;
      producer?: string;
      curator?: string;
      seller?: string;
      permlink?: string;
      voter?: string;
      weight?: number;
      body?: string;
      json_metadata?: string;
      parent_author?: string;
      parent_permlink?: string;
      title?: string;
      required_posting_auths?: string[];
      required_auths?: string[];
      id?: string;
      json?: string;
      message?: string;
      'org-op-id'?: string;
      perspective?: 'incoming' | 'outgoing';
      current_owner?: string;
      reward: NaiAsset;
      vesting_payout: NaiAsset;
      hbd_payout: NaiAsset;
      hive_payout: NaiAsset;
    }
  };
}

export type AccountRewardsHistory = [
  number,
  {
    trx_id: string;
    block: number;
    trx_in_block: number;
    op_in_trx: number;
    virtual_op: boolean;
    timestamp: string;
    op: ['author_reward' | 'curation_reward', IAuthorReward | ICurationReward];
  }
];

export interface IProposalVote {
  id: number;
  proposal: IProposal;
  voter: string;
}

export interface IDynamicGlobalProperties {
  hbd_print_rate: number;
  total_vesting_fund_hive: string;
  total_vesting_shares: string;
  hbd_interest_rate: number;
  head_block_number: number;
  head_block_id: string;
  vesting_reward_percent: number;
  virtual_supply: string;
}

export interface IAccountReputations {
  account: string;
  reputation: number;
}

export interface IMarketCandlestickDataItem {
  hive: {
    high: number;
    low: number;
    open: number;
    close: number;
    volume: number;
  };
  id: number;
  non_hive: {
    high: number;
    low: number;
    open: number;
    close: number;
    volume: number;
  };
  open: string;
  seconds: number;
}

export interface ITrendingTag {
  comments: number;
  name: string;
  top_posts: number;
  total_payouts: string;
}

export interface IFollow {
  follower: string;
  following: string;
  what: string[];
  //added only when using optimistic update, not backend property
  _temporary?: boolean;
}

export interface ICollateralizedConversionRequest {
  collateral_amount: string;
  conversion_date: string;
  converted_amount: string;
  id: number;
  owner: string;
  requestid: number;
}

interface IWitnessVote {
  id: number;
  witness: string;
  account: string;
}

export interface IListWitnessVotes {
  votes: IWitnessVote[];
}

export interface IVoteListItem {
  id: number;
  voter: string;
  author: string;
  permlink: string;
  weight: string;
  rshares: number;
  vote_percent: number;
  last_update: string;
  num_changes: number;
  // added only when using optimistic update, not backend property
  _temporary: boolean;
}

export interface IAccountNotification {
  date: string;
  id?: number;
  msg: string;
  score: number;
  type: string;
  url: string;
}

export interface IGetPostHeader {
  author: string;
  permlink: string;
  category: string;
  depth: number;
}

export interface IAccountRelationship {
  follows: boolean;
  ignores: boolean;
  is_blacklisted: boolean;
  follows_blacklists: boolean;
}

export interface IUnreadNotifications {
  lastRead: string;
  unread: number;
}

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

export interface PostsSearchParams {
  q: string;
  truncate?: number;
  result_limit?: number;
  full_posts?: number;
  observer?: string;
}

export interface PostsSimilarParams {
  author: string;
  permlink: string;
  truncate?: number;
  result_limit?: number;
  full_posts?: number;
  observer?: string;
}

export interface PostsByIdsParams {
  posts: Array<{ author: string; permlink: string }>;
  truncate?: number;
  observer?: string;
}

export interface SimilarPostsParams {
  author: string;
  permlink: string;
  truncate?: number;
  result_limit?: number;
  full_posts?: number;
  observer?: string;
}

// Stub entry type for posts with only author/permlink
export interface PostStub {
  author: string;
  permlink: string;
}

// Mixed response type for new API endpoints
export type MixedPostsResponse = Array<Entry | PostStub>;

export interface ApiTag {
  description: string;
  name: string;
}

export interface HivesenseStatusResponse {
  externalDocs: {
    description: string;
    url: string;
  };
  info: {
    description: string;
    title: string;
    version: string;
    license: {
      name: string;
      url: string;
    };
  };
  paths: unknown;
  servers: string[];
  tags: ApiTag[];
}

export interface IDirectDelegation {
  rc_direct_delegations: {
    delegated_rc: number;
    from: string;
    to: string;
  }[];
}
export interface GetOperationsByAccountParams {
  'account-name'?: string;
  'observer-name'?: string;
  'operation-types'?: string;
  page?: number;
  'page-size'?: number;
  'data-size-limit'?: number;
  'from-block'?: string;
  'to-block'?: string;
}

export interface IGetOperationsByAccountResponse {
  total_operations: number;
  total_pages: number;
  block_range: {
    from: number;
    to: number;
  };
  operations_result: HiveOperation[];
}

export type ExtendedNodeApi = {
  bridge: {
    get_post_header: TWaxApiRequest<{ author: string; permlink: string }, IGetPostHeader>;
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
      { account: string; lastId?: number; limit: number },
      IAccountNotification[] | null
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
    unread_notifications: TWaxApiRequest<{ account: string }, IUnreadNotifications | null>;
    get_relationship_between_accounts: TWaxApiRequest<string[], IAccountRelationship | null>;
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
    get_vesting_delegations: TWaxApiRequest<(string | number)[], IDelegatedVestingShare[]>;
    list_proposal_votes: TWaxApiRequest<(string | number | (string | number)[])[], IProposalVote[]>;
    get_dynamic_global_properties: TWaxApiRequest<[], IDynamicGlobalProperties>;
    get_accounts: TWaxApiRequest<[string[]], FullAccount[]>;
    get_account_reputations: TWaxApiRequest<
      {
        account_lower_bound: string;
        limit: number;
      },
      IAccountReputations[]
    >;
    get_market_history: TWaxApiRequest<(string | number)[], IMarketCandlestickDataItem[]>;
    get_followers: TWaxApiRequest<(string | number | null)[], IFollow[]>;
    get_following: TWaxApiRequest<(string | number | null)[], IFollow[]>;
  };
  rc_api: {
    find_rc_accounts: TWaxApiRequest<string[], { rc_accounts: RcAccount[] }>;
    list_rc_direct_delegations: TWaxApiRequest<{ limit: number; start: [string, string] }, IDirectDelegation>;
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
      params: VerifySignaturesParams;
      result: VerifySignaturesResponse;
    };
    get_trending_tags: TWaxApiRequest<(string | number)[], ITrendingTag[]>;
    get_collateralized_conversion_requests: TWaxApiRequest<string[], ICollateralizedConversionRequest[]>;
    list_witness_votes: TWaxApiRequest<{ start: string[]; limit: number; order: string }, IListWitnessVotes>;
    list_votes: TWaxApiRequest<
      {
        start: [string, string, string] | null;
        limit: number;
        order: 'by_comment_voter' | 'by_voter_comment';
      },
      { votes: IVoteListItem[] }
    >;
  };
  network_broadcast_api: {
    broadcast_transaction: TWaxApiRequest<transaction[], transaction>;
  };
  'search-api': {
    find_text: TWaxApiRequest<SearchType, Entry[]>;
  };
};

type TEmptyReq = {};
export interface HivesenseEndpointsPostsSearchParams {
  /** Search query text for semantic similarity, e.g. `"vector databases"` */
  q: string;
  /**
   * Body truncation length (0 = full content, >0 = truncate to N chars)
   * @default 0
   */
  truncate?: number;
  /**
   * Total number of posts (full + stub) to return
   * @min 1
   * @max 1000
   * @default 100
   */
  result_limit?: number;
  /**
   * How many of the top results should include full post data
   * @min 0
   * @max 50
   * @default 10
   */
  full_posts?: number;
  /**
   * Hive account whose mute lists etc. will be respected
   * @default ""
   */
  observer?: string;
}

export interface HivesenseEndpointsPostsSimilarParams {
  /**
   * Controls the length of returned post bodies in the results. When set to 0,
   * returns complete post content. Any other positive value will truncate the
   * post body to that many characters. Useful for generating previews or
   * reducing response size. Maximum value is 65535 characters.
   * @min 0
   * @max 65535
   * @default 0
   * @example 20
   */
  truncate?: number;
  /**
   * Total number of posts (full + stub) to return. Must be between
   * 1 and 1000. The posts are returned in order of similarity, with the most
   * similar posts first. Setting a lower limit can improve response times
   * and reduce data transfer.
   * @min 1
   * @max 1000
   * @default 100
   * @example 100
   */
  result_limit?: number;
  /**
   * How many of the top results should include full post data. Any
   * remaining posts (up to result_limit) will be stub entries with only
   * author & permlink. Set this to the size of your first page of results.
   * @min 0
   * @max 50
   * @default 10
   * @example 10
   */
  full_posts?: number;
  /**
   * Optional Hive account name with blacklists that will be used to filter the
   * results. When provided, any posts from authors in the observer
   * blacklist will be excluded from the results. Leave empty to disable
   * blacklist filtering. Useful for content moderation and personalization.
   * @default ""
   * @example "hive.blog"
   */
  observer?: string;
  /**
   * The Hive username of the post author. This is the account name that
   * created the original post for which you want to find similar content.
   * Must be a valid Hive account name.
   * @example "bue-witness"
   */
  author: string;
  /**
   * The unique permlink identifier of the post. This is the URL-friendly
   * version of the post title that appears in the post URL on Hive.
   * Together with the author name, it uniquely identifies the post.
   * @example "my-blog-post"
   */
  permlink: string;
}

export interface HivesenseEndpointsAuthorsSearchParams {
  /**
   * Topic or theme to search for. Authors whose posts are semantically related to this topic will be returned.
   * @example "Make witness node secure against hackers attack and emergency situations"
   */
  topic: string;
  /**
   * Maximum number of authors to return (1-100).
   * @min 1
   * @max 100
   * @default 10
   * @example 10
   */
  result_limit?: number;
  /**
   * Observer (hive account name) whose settings (such as muted lists) are used to filter out excluded posts from the search results
   * @default ""
   */
  observer?: string;
}

export interface HivesenseEndpointsPostsByIdsPayload {
  /**
   * Array of post identifiers. Each item must have both 'author'
   * and 'permlink' fields. Maximum 50 posts per request.
   * @maxItems 50
   * @minItems 1
   * @example [{"author":"bue-witness","permlink":"my-first-post"},{"author":"another-user","permlink":"interesting-topic"}]
   */
  posts: {
    /** The Hive username of the post author */
    author: string;
    /** The unique permlink identifier of the post */
    permlink: string;
  }[];
  /**
   * Body truncation length. 0 returns full content, positive values
   * truncate to N characters. Useful for preview mode.
   * @min 0
   * @max 65535
   * @default 0
   */
  truncate?: number;
  /**
   * Optional Hive account whose mute lists and blacklists will be
   * applied to filter results. Leave empty to disable filtering.
   * @default ""
   */
  observer?: string;
}

export interface HivesenseEndpointsPostsByIdsQueryParams {
  /**
   * URL-encoded JSON array of post identifiers. Each object must have
   * 'author' and 'permlink' fields. Maximum 10 posts for GET requests.
   * @example "[{"author":"bue-witness","permlink":"my-post"}]"
   */
  posts: string;
  /**
   * Body truncation length (0 = full content)
   * @min 0
   * @max 65535
   * @default 0
   */
  truncate?: number;
  /**
   * Optional Hive account for filtering
   * @default ""
   */
  observer?: string;
}

export interface HiveOpTypeSchema {
  op_type_id: number;
  operation_name: string;
  is_virtual: boolean;
}


export type ExtendedRestApi = {
  'hivesense-api': {
    params: undefined;
    result: HivesenseStatusResponse;
    posts: {
      search: {
        result: MixedPostsResponse;
        params: HivesenseEndpointsPostsSearchParams & TEmptyReq & {};
      };
      author: {
        permlink: {
          similar: {
            result: Entry[];
            params: HivesenseEndpointsPostsSimilarParams &
              TEmptyReq & {
                /** The Hive username of the post author. This is the account name that
created the original post for which you want to find similar content.
Must be a valid Hive account name.
 */
                author: string;

                /** The unique permlink identifier of the post. This is the URL-friendly
version of the post title that appears in the post URL on Hive.
Together with the author name, it uniquely identifies the post.
 */
                permlink: string;
              };
          };
        };
      };
      byIds: {
        result: Entry[];
        params: TEmptyReq & HivesenseEndpointsPostsByIdsPayload & {};
      };
      byIdsQuery: {
        result: string;
        params: HivesenseEndpointsPostsByIdsQueryParams & TEmptyReq & {};
      };
    };
    authors: {
      search: {
        result: string;
        params: HivesenseEndpointsAuthorsSearchParams & TEmptyReq & {};
      };
    };
  };
  'hivemind-api': {
    accountsOperations: {
      params: GetOperationsByAccountParams;
      result: IGetOperationsByAccountResponse;
    }
  };
  'hafah-api': {
    'operation-types': {
      params: undefined;
      result: HiveOpTypeSchema[];
    }
  }
};

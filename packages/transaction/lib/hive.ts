import { Moment } from 'moment';
import { AccountFollowStats, AccountProfile, FullAccount } from './app-types';
import {
  TWaxApiRequest,
  IManabarData,
  IHiveChainInterface,
  transaction,
  NaiAsset,
  ApiAccount
} from '@hive/wax';
import { isCommunity, parseAsset } from '@ui/lib/utils';
import { vestsToRshares } from '@ui/lib/utils';
import { DATA_LIMIT } from './bridge';
import { hiveChainService } from './hive-chain-service';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

const chain = await hiveChainService.getHiveChain();

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

type GetDynamicGlobalProperties = {
  condenser_api: {
    get_dynamic_global_properties: TWaxApiRequest<[], IDynamicGlobalProperties>;
  };
};

export const getDynamicGlobalProperties = async (): Promise<IDynamicGlobalProperties> => {
  return chain
    .extend<GetDynamicGlobalProperties>()
    .api.condenser_api.get_dynamic_global_properties([])
    .then((r: any) => {
      return {
        total_vesting_fund_hive: r.total_vesting_fund_hive || r.total_vesting_fund_steem,
        total_vesting_shares: r.total_vesting_shares,
        hbd_print_rate: r.hbd_print_rate || r.sbd_print_rate,
        hbd_interest_rate: r.hbd_interest_rate,
        head_block_number: r.head_block_number,
        head_block_id: r.head_block_id,
        vesting_reward_percent: r.vesting_reward_percent,
        virtual_supply: r.virtual_supply
      };
    });
};

type GetAccountsnData = {
  condenser_api: {
    get_accounts: TWaxApiRequest<[string[]], FullAccount[]>;
  };
};

export const getAccounts = async (usernames: string[]): Promise<FullAccount[]> => {
  return chain
    .extend<GetAccountsnData>()
    .api.condenser_api.get_accounts([usernames])
    .then((resp: any[]): FullAccount[] =>
      resp.map((x) => {
        const account: FullAccount = {
          name: x.name,
          owner: x.owner,
          active: x.active,
          posting: x.posting,
          memo_key: x.memo_key,
          post_count: x.post_count,
          created: x.created,
          reputation: x.reputation,
          posting_json_metadata: x.posting_json_metadata,
          last_vote_time: x.last_vote_time,
          last_post: x.last_post,
          json_metadata: x.json_metadata,
          reward_hive_balance: x.reward_hive_balance,
          reward_hbd_balance: x.reward_hbd_balance,
          reward_vesting_hive: x.reward_vesting_hive,
          reward_vesting_balance: x.reward_vesting_balance,
          balance: x.balance,
          hbd_balance: x.hbd_balance,
          savings_balance: x.savings_balance,
          savings_hbd_balance: x.savings_hbd_balance,
          savings_hbd_last_interest_payment: x.savings_hbd_last_interest_payment,
          savings_hbd_seconds_last_update: x.savings_hbd_seconds_last_update,
          savings_hbd_seconds: x.savings_hbd_seconds,
          next_vesting_withdrawal: x.next_vesting_withdrawal,
          vesting_shares: x.vesting_shares,
          delegated_vesting_shares: x.delegated_vesting_shares,
          received_vesting_shares: x.received_vesting_shares,
          vesting_withdraw_rate: x.vesting_withdraw_rate,
          to_withdraw: x.to_withdraw,
          withdrawn: x.withdrawn,
          witness_votes: x.witness_votes,
          proxy: x.proxy,
          proxied_vsf_votes: x.proxied_vsf_votes,
          voting_manabar: x.voting_manabar,
          voting_power: x.voting_power,
          downvote_manabar: x.downvote_manabar,
          vesting_balance: x.vesting_balance,
          __loaded: true
        };

        let profile: AccountProfile | undefined;

        try {
          profile = JSON.parse(x.posting_json_metadata!).profile;
        } catch (e) {}

        if (!profile) {
          try {
            profile = JSON.parse(x.json_metadata!).profile;
          } catch (e) {}
        }

        if (!profile) {
          profile = {
            about: '',
            cover_image: '',
            location: '',
            name: '',
            profile_image: '',
            website: ''
          };
        }

        return { ...account, profile };
      })
    );
};

export const getAccount = (username: string): Promise<FullAccount> =>
  getAccounts([username]).then((resp) => resp[0]);

export const getAccountFull = (username: string): Promise<FullAccount> =>
  getAccount(username).then(async (account) => {
    let follow_stats: AccountFollowStats | undefined;
    try {
      follow_stats = await getFollowCount(username);
    } catch (e) {}

    return { ...account, follow_stats };
  });

type GetFindsAccountsData = {
  database_api: {
    find_accounts: TWaxApiRequest<string, { accounts: ApiAccount[] }>;
  };
};

export const getFindAccounts = (username: string): Promise<{ accounts: ApiAccount[] }> => {
  return chain.extend<GetFindsAccountsData>().api.database_api.find_accounts({ accounts: [username] });
};
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

type GetFeedHistoryData = {
  database_api: {
    get_feed_history: TWaxApiRequest<void, IFeedHistory>;
  };
};

export const getFeedHistory = async (): Promise<IFeedHistory> => {
  return chain.extend<GetFeedHistoryData>().api.database_api.get_feed_history();
};

type GetFollowCountData = {
  condenser_api: {
    get_follow_count: TWaxApiRequest<string[], AccountFollowStats>;
  };
};

export const getFollowCount = async (username: string): Promise<AccountFollowStats> => {
  return chain.extend<GetFollowCountData>().api.condenser_api.get_follow_count([username]);
};

export interface ITrendingTag {
  comments: number;
  name: string;
  top_posts: number;
  total_payouts: string;
}

export interface IDynamicProps {
  hivePerMVests: number;
  base: number;
  quote: number;
  fundRewardBalance: number;
  fundRecentClaims: number;
  hbdPrintRate: number;
  hbdInterestRate: number;
  headBlock: number;
  totalVestingFund: number;
  totalVestingShares: number;
  virtualSupply: number;
  vestingRewardPercent: number;
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

export interface IRewardFund {
  recent_claims: string;
  reward_balance: string;
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

export interface ITradeDataItem {
  current_pays: string;
  date: number;
  open_pays: string;
}

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

type GetPostData = {
  condenser_api: {
    get_content: TWaxApiRequest<string[], IPost>;
  };
};

export const getPost = async (username: string, permlink: string): Promise<IPost> => {
  return chain.extend<GetPostData>().api.condenser_api.get_content([username, permlink]);
};

interface IAccountReputationParams {
  account_lower_bound: string;
  limit: number;
}

interface IAccountReputation {
  account: string;
  reputation: number;
}

interface IAccountReputations {
  account: string;
  reputation: number;
}

type GetAccountReputationData = {
  condenser_api: {
    get_account_reputations: TWaxApiRequest<IAccountReputationParams, IAccountReputations[]>;
  };
};

export const getAccountReputations = async (
  account_lower_bound: string,
  limit: number
): Promise<IAccountReputations[]> => {
  return chain
    .extend<GetAccountReputationData>()
    .api.condenser_api.get_account_reputations({ account_lower_bound, limit });
};

type GetMarketBucketSizesData = {
  condenser_api: {
    get_market_history_buckets: TWaxApiRequest<void[], number[]>;
  };
};

export const getMarketBucketSizes = async (): Promise<number[]> => {
  return chain.extend<GetMarketBucketSizesData>().api.condenser_api.get_market_history_buckets([]);
};

type GetMarketHistoryData = {
  condenser_api: {
    get_market_history: TWaxApiRequest<(string | number)[], IMarketCandlestickDataItem[]>;
  };
};

export const getMarketHistory = async (
  seconds: number,
  startDate: Moment,
  endDate: Moment
): Promise<IMarketCandlestickDataItem[]> => {
  let todayEarlier: string = startDate.format().split('+')[0];
  let todayNow: string = endDate.format().split('+')[0];
  return chain
    .extend<GetMarketHistoryData>()
    .api.condenser_api.get_market_history([seconds, todayEarlier, todayNow]);
};

type GetActiveVotesData = {
  condenser_api: {
    get_active_votes: TWaxApiRequest<string[], IVote[]>;
  };
};

export const getActiveVotes = async (author: string, permlink: string): Promise<IVote[]> => {
  return chain.extend<GetActiveVotesData>().api.condenser_api.get_active_votes([author, permlink]);
};

type GetTrendingTagsData = {
  database_api: {
    get_trending_tags: TWaxApiRequest<(string | number)[], ITrendingTag[]>;
  };
};

export const getTrendingTags = async (afterTag: string = '', limit: number = 250): Promise<string[]> => {
  return chain
    .extend<GetTrendingTagsData>()
    .api.database_api.get_trending_tags([afterTag, limit])
    .then((tags: ITrendingTag[]) => {
      return tags
        .filter((x: ITrendingTag) => x.name !== '')
        .filter((x: ITrendingTag) => !isCommunity(x.name))
        .map((x: ITrendingTag) => x.name);
    });
};

export const getAllTrendingTags = async (
  afterTag: string = '',
  limit: number = 250
): Promise<ITrendingTag[] | void> => {
  return chain
    .extend<GetTrendingTagsData>()
    .api.database_api.get_trending_tags([afterTag, limit])
    .then((tags: ITrendingTag[]) => {
      return tags.filter((x) => x.name !== '').filter((x) => !isCommunity(x.name));
    })
    .catch((reason) => {
      debugger;
    });
};

type LookupAccountsData = {
  database_api: {
    lookup_accounts: TWaxApiRequest<(string | number)[], string[]>;
  };
};

export const lookupAccounts = async (q: string, limit = 50): Promise<string[]> => {
  return chain.extend<LookupAccountsData>().api.database_api.lookup_accounts([q, limit]);
};

export interface IFollow {
  follower: string;
  following: string;
  what: string[];
}

export interface IGetFollowParams {
  account: string;
  start: string | null;
  type: string;
  limit: number;
}
export const DEFAULT_PARAMS_FOR_FOLLOW: IGetFollowParams = {
  account: '',
  start: null,
  type: 'blog',
  limit: 50
};

type GetFollowersData = {
  condenser_api: {
    get_followers: TWaxApiRequest<(string | number | null)[], IFollow[]>;
  };
};
export const getFollowers = async (params?: Partial<IGetFollowParams>): Promise<IFollow[]> => {
  try {
    return chain
      .extend<GetFollowersData>()
      .api.condenser_api.get_followers([
        params?.account || DEFAULT_PARAMS_FOR_FOLLOW.account,
        params?.start || DEFAULT_PARAMS_FOR_FOLLOW.start,
        params?.type || DEFAULT_PARAMS_FOR_FOLLOW.type,
        params?.limit || DEFAULT_PARAMS_FOR_FOLLOW.limit
      ]);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

type GetFollowingData = {
  condenser_api: {
    get_following: TWaxApiRequest<(string | number | null)[], IFollow[]>;
  };
};
export const getFollowing = async (params?: Partial<IGetFollowParams>): Promise<IFollow[]> => {
  try {
    return chain
      .extend<GetFollowingData>()
      .api.condenser_api.get_following([
        params?.account || DEFAULT_PARAMS_FOR_FOLLOW.account,
        params?.start || DEFAULT_PARAMS_FOR_FOLLOW.start,
        params?.type || DEFAULT_PARAMS_FOR_FOLLOW.type,
        params?.limit || DEFAULT_PARAMS_FOR_FOLLOW.limit
      ]);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

type GetRewardFundData = {
  database_api: {
    get_reward_fund: TWaxApiRequest<string[], IRewardFund>;
  };
};
export const getRewardFund = async (): Promise<IRewardFund> => {
  return chain.extend<GetRewardFundData>().api.database_api.get_reward_fund(['post']);
};

export const getDynamicProps = async (): Promise<IDynamicProps> => {
  const globalDynamic = await getDynamicGlobalProperties();
  const feedHistory = await getFeedHistory();
  const rewardFund = await getRewardFund();

  const hivePerMVests =
    (parseAsset(globalDynamic.total_vesting_fund_hive).amount /
      parseAsset(globalDynamic.total_vesting_shares).amount) *
    1e6;
  const base = parseAsset(feedHistory.current_median_history.base).amount;
  const quote = parseAsset(feedHistory.current_median_history.quote).amount;
  const fundRecentClaims = parseFloat(rewardFund.recent_claims);
  const fundRewardBalance = parseAsset(rewardFund.reward_balance).amount;
  const hbdPrintRate = globalDynamic.hbd_print_rate;
  const hbdInterestRate = globalDynamic.hbd_interest_rate;
  const headBlock = globalDynamic.head_block_number;
  const totalVestingFund = parseAsset(globalDynamic.total_vesting_fund_hive).amount;
  const totalVestingShares = parseAsset(globalDynamic.total_vesting_shares).amount;
  const virtualSupply = parseAsset(globalDynamic.virtual_supply).amount;
  const vestingRewardPercent = globalDynamic.vesting_reward_percent;

  return {
    hivePerMVests,
    base,
    quote,
    fundRecentClaims,
    fundRewardBalance,
    hbdPrintRate,
    hbdInterestRate,
    headBlock,
    totalVestingFund,
    totalVestingShares,
    virtualSupply,
    vestingRewardPercent
  };
};

export interface WithdrawRoute {
  auto_vest: boolean;
  from_account: string;
  id: number;
  percent: number;
  to_account: string;
}

type GetWithdrawRoutesData = {
  database_api: {
    get_withdraw_routes: TWaxApiRequest<string[], WithdrawRoute[]>;
  };
};
export const getWithdrawRoutes = async (account: string): Promise<WithdrawRoute[]> => {
  return chain.extend<GetWithdrawRoutesData>().api.database_api.get_withdraw_routes([account, 'outgoing']);
};

export const powerRechargeTime = (power: number) => {
  const missingPower = 100 - power;
  return (missingPower * 100 * 432000) / 10000;
};

export const votingValue = (
  account: FullAccount,
  dynamicProps: IDynamicProps,
  votingPower: number,
  weight: number = 10000
): number => {
  const { fundRecentClaims, fundRewardBalance, base, quote } = dynamicProps;

  const total_vests =
    parseAsset(account.vesting_shares).amount +
    parseAsset(account.received_vesting_shares).amount -
    parseAsset(account.delegated_vesting_shares).amount;

  const rShares = vestsToRshares(total_vests, votingPower, weight);

  return (rShares / fundRecentClaims) * fundRewardBalance * (base / quote);
};

const HIVE_VOTING_MANA_REGENERATION_SECONDS = 5 * 60 * 60 * 24; //5 days

export const downVotingPower = (account: FullAccount): number => {
  const totalShares =
    parseFloat(account.vesting_shares) +
    parseFloat(account.received_vesting_shares) -
    parseFloat(account.delegated_vesting_shares) -
    parseFloat(account.vesting_withdraw_rate);
  const elapsed = Math.floor(Date.now() / 1000) - account.downvote_manabar.last_update_time;
  const maxMana = (totalShares * 1000000) / 4;

  let currentMana =
    parseFloat(account.downvote_manabar.current_mana.toString()) +
    (elapsed * maxMana) / HIVE_VOTING_MANA_REGENERATION_SECONDS;

  if (currentMana > maxMana) {
    currentMana = maxMana;
  }
  const currentManaPerc = (currentMana * 100) / maxMana;

  if (isNaN(currentManaPerc)) {
    return 0;
  }

  if (currentManaPerc > 100) {
    return 100;
  }
  return currentManaPerc;
};

export interface IConversionRequest {
  amount: string;
  conversion_date: string;
  id: number;
  owner: string;
  requestid: number;
}

export interface ICollateralizedConversionRequest {
  collateral_amount: string;
  conversion_date: string;
  converted_amount: string;
  id: number;
  owner: string;
  requestid: number;
}

type GetConversionRequestsData = {
  database_api: {
    get_conversion_requests: TWaxApiRequest<string[], IConversionRequest[]>;
  };
};
export const getConversionRequests = async (account: string): Promise<IConversionRequest[]> => {
  return chain.extend<GetConversionRequestsData>().api.database_api.get_conversion_requests([account]);
};

type GetCollateralizedConversionRequestsData = {
  database_api: {
    get_collateralized_conversion_requests: TWaxApiRequest<string[], ICollateralizedConversionRequest[]>;
  };
};
export const getCollateralizedConversionRequests = async (
  account: string
): Promise<ICollateralizedConversionRequest[]> => {
  return chain
    .extend<GetCollateralizedConversionRequestsData>()
    .api.database_api.get_collateralized_conversion_requests([account]);
};

export interface SavingsWithdrawRequest {
  id: number;
  from: string;
  to: string;
  memo: string;
  request_id: number;
  amount: string;
  complete: string;
}

type GetSavingsWithdrawFromData = {
  database_api: {
    get_savings_withdraw_from: TWaxApiRequest<string[], SavingsWithdrawRequest[]>;
  };
};
export const getSavingsWithdrawFrom = async (account: string): Promise<SavingsWithdrawRequest[]> => {
  return chain.extend<GetSavingsWithdrawFromData>().api.database_api.get_savings_withdraw_from([account]);
};

export interface BlogEntry {
  blog: string;
  entry_id: number;
  author: string;
  permlink: string;
  reblogged_on: string;
}

type GetBlogEntriesData = {
  condenser_api: {
    get_blog_entries: TWaxApiRequest<(string | number)[], BlogEntry[]>;
  };
};
export const getBlogEntries = async (username: string, limit: number = DATA_LIMIT): Promise<BlogEntry[]> => {
  return chain.extend<GetBlogEntriesData>().api.condenser_api.get_blog_entries([username, 0, limit]);
};

type BrodcastTransactionData = {
  network_broadcast_api: {
    broadcast_transaction: TWaxApiRequest<transaction[], transaction>;
  };
};
export const brodcastTransaction = async (transaction: any): Promise<any> => {
  return chain
    .extend<BrodcastTransactionData>()
    .api.network_broadcast_api.broadcast_transaction([transaction]);
};

// create type for api call result do working search
// export const searchTag = async (
//   q: string = '',
//   scroll_id: string = '',
//   sort: string = 'newest',
// ): Promise<any> => {
//   const bodyData = { q, scroll_id, sort };
//   const bodyWithCSRF = {
//     ...bodyData,
//     _csrf: window.$STM_csrf,
//   };
//   const response = await fetch('https://hive.blog/api/v1/search', {
//     method: 'post',
//     body: JSON.stringify(bodyData),
//     headers: { 'Content-Type': 'application/json' }
//   });
//   return await response.json();
// };

interface IManabars {
  upvote: IManabarData;
  downvote: IManabarData;
  rc: IManabarData;
  upvoteCooldown: Date;
  downvoteCooldown: Date;
  rcCooldown: Date;
}

interface ISingleManabar {
  max: string;
  current: string;
  percentageValue: number;
  cooldown: Date;
}

interface Manabar {
  upvote: ISingleManabar;
  downvote: ISingleManabar;
  rc: ISingleManabar;
}
export const getManabars = async (
  accountName: string,
  hiveChain: IHiveChainInterface
): Promise<IManabars | null> => {
  try {
    const upvoteCooldownPromise = hiveChain.calculateManabarFullRegenerationTimeForAccount(accountName, 0);
    const downvoteCooldownPromise = hiveChain.calculateManabarFullRegenerationTimeForAccount(accountName, 1);
    const rcCooldownPromise = hiveChain.calculateManabarFullRegenerationTimeForAccount(accountName, 2);
    const upvotePromise = hiveChain.calculateCurrentManabarValueForAccount(accountName, 0);
    const downvotePromise = hiveChain.calculateCurrentManabarValueForAccount(accountName, 1);
    const rcPromise = hiveChain.calculateCurrentManabarValueForAccount(accountName, 2);
    const manabars = await Promise.all([
      upvotePromise,
      upvoteCooldownPromise,
      downvotePromise,
      downvoteCooldownPromise,
      rcPromise,
      rcCooldownPromise
    ]);
    return {
      upvote: manabars[0],
      upvoteCooldown: manabars[1],
      downvote: manabars[2],
      downvoteCooldown: manabars[3],
      rc: manabars[4],
      rcCooldown: manabars[5]
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};
export const getManabar = async (
  accountName: string,
  hiveChain: IHiveChainInterface
): Promise<Manabar | null> => {
  const manabars = await getManabars(accountName, hiveChain!);
  if (!manabars) return null;
  const { upvote, upvoteCooldown, downvote, downvoteCooldown, rc, rcCooldown } = manabars;

  const processedManabars: Manabar = {
    upvote: {
      cooldown: upvoteCooldown,
      max: upvote.max.toString(),
      current: upvote.current.toString(),
      percentageValue: upvote.percent
    },
    downvote: {
      cooldown: downvoteCooldown,
      max: downvote.max.toString(),
      current: downvote.current.toString(),
      percentageValue: downvote.percent
    },
    rc: {
      cooldown: rcCooldown,
      max: rc.max.toString(),
      current: rc.current.toString(),
      percentageValue: rc.percent
    }
  };
  return processedManabars;
};

interface IWitnessVote {
  id: number;
  witness: string;
  account: string;
}

interface IListWitnessVotes {
  votes: IWitnessVote[];
}
type GetListWitnessVotesData = {
  database_api: {
    list_witness_votes: TWaxApiRequest<{ start: string[]; limit: number; order: string }, IListWitnessVotes>;
  };
};

export const getListWitnessVotes = async (
  username: string,
  limit: number,
  order: string
): Promise<IListWitnessVotes> => {
  return chain
    .extend<GetListWitnessVotesData>()
    .api.database_api.list_witness_votes({ start: [username, ''], limit, order });
};

interface IVoteListItem {
  id: number,
  voter: string,
  author: string,
  permlink: string,
  weight: string,
  rshares: number,
  vote_percent: number,
  last_update: string,
  num_changes: number,
}

type GetListVotesData = {
  database_api: {
    list_votes: TWaxApiRequest<{ start: [string, string, string] | null; limit: number; order: 'by_comment_voter' | 'by_voter_comment' }, { votes: IVoteListItem[] }>;
  };
};

// See https://developers.hive.io/apidefinitions/#database_api.list_votes
export const getListVotesByCommentVoter = async (
  start: [string, string, string] | null, // should be [author, permlink, voter]
  limit: number,
): Promise<{ votes: IVoteListItem[] }> => {
  return chain
    .extend<GetListVotesData>()
    .api.database_api.list_votes({ start, limit, order: 'by_comment_voter' });
};

export const getListVotesByVoterComment = async (
  start: [string, string, string] | null, // should be [voter, author, permlink]
  limit: number,
): Promise<{ votes: IVoteListItem[] }> => {
  return chain
    .extend<GetListVotesData>()
    .api.database_api.list_votes({ start, limit, order: 'by_voter_comment' });
};

import { Moment } from 'moment';
import { AccountFollowStats, AccountProfile, FullAccount } from './app-types';
import {
  ApiAccount,
  TWaxApiRequest,
  createHiveChain,
  GetDynamicGlobalPropertiesResponse,
  IManabarData,
  IHiveChainInterface,
  transaction
} from '@hive/wax/web';
import { isCommunity, parseAsset } from '@ui/lib/utils';
import { vestsToRshares } from '@ui/lib/utils';
import { DATA_LIMIT } from './bridge';

export type IDynamicGlobalProperties = GetDynamicGlobalPropertiesResponse;

export const getDynamicGlobalProperties = async (): Promise<IDynamicGlobalProperties> => {
  const chain = await createHiveChain();
  return chain.api.database_api.get_dynamic_global_properties({});
};

export const getAccounts = async (usernames: string[]): Promise<FullAccount[]> => {
  const chain = await createHiveChain();
  return chain.api.database_api
    .find_accounts({ accounts: usernames })
    .then((resp: { accounts: ApiAccount[] }): FullAccount[] =>
      resp.accounts.map((x: ApiAccount) => {
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

        return { ...x, profile };
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

export interface IFeedHistory {
  current_median_history: {
    base: string;
    quote: string;
  };
  price_history: [
    {
      base: string;
      quote: string;
    }
  ];
}

type GetFeedHistoryData = {
  database: {
    get_feed_history: TWaxApiRequest<void, IFeedHistory>;
  };
};

export const getFeedHistory = async (): Promise<IFeedHistory> => {
  const chain = await createHiveChain();
  return chain.extend<GetFeedHistoryData>().api.database.get_feed_history();
};

type GetFollowCountData = {
  condenser_api: {
    get_follow_count: TWaxApiRequest<string[], AccountFollowStats>;
  };
};

export const getFollowCount = async (username: string): Promise<AccountFollowStats> => {
  const chain = await createHiveChain();
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
  const chain = await createHiveChain();
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
  reputations: IAccountReputation[];
}

type GetAccountReputationData = {
  reputation_api: {
    get_account_reputations: TWaxApiRequest<IAccountReputationParams, IAccountReputations>;
  };
};

export const getAccountReputations = async (
  account_lower_bound: string,
  limit: number
): Promise<IAccountReputations> => {
  const chain = await createHiveChain();
  return chain
    .extend<GetAccountReputationData>()
    .api.reputation_api.get_account_reputations({ account_lower_bound, limit });
};

type GetMarketBucketSizesData = {
  condenser_api: {
    get_market_history_buckets: TWaxApiRequest<void[], number[]>;
  };
};

export const getMarketBucketSizes = async (): Promise<number[]> => {
  const chain = await createHiveChain();
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
  const chain = await createHiveChain();
  return chain
    .extend<GetMarketHistoryData>()
    .api.condenser_api.get_market_history([seconds, todayEarlier, todayNow]);
};

type GetActiveVotesData = {
  database_api: {
    get_active_votes: TWaxApiRequest<string[], IVote[]>;
  };
};

export const getActiveVotes = async (author: string, permlink: string): Promise<IVote[]> => {
  const chain = await createHiveChain();
  return chain.extend<GetActiveVotesData>().api.database_api.get_active_votes([author, permlink]);
};

type GetTrendingTagsData = {
  database_api: {
    get_trending_tags: TWaxApiRequest<(string | number)[], ITrendingTag[]>;
  };
};

export const getTrendingTags = async (afterTag: string = '', limit: number = 250): Promise<string[]> => {
  const chain = await createHiveChain();
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
  const chain = await createHiveChain();
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
  const chain = await createHiveChain();
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
    const chain = await createHiveChain();
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
    const chain = await createHiveChain();
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
  const chain = await createHiveChain();
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
  const chain = await createHiveChain();
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
    parseFloat(account.vesting_shares.amount) +
    parseFloat(account.received_vesting_shares.amount) -
    parseFloat(account.delegated_vesting_shares.amount) -
    parseFloat(account.vesting_withdraw_rate.amount);
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
  const chain = await createHiveChain();
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
  const chain = await createHiveChain();
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
  const chain = await createHiveChain();
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
  const chain = await createHiveChain();
  return chain.extend<GetBlogEntriesData>().api.condenser_api.get_blog_entries([username, 0, limit]);
};

type BrodcastTransactionData = {
  network_broadcast_api: {
    broadcast_transaction: TWaxApiRequest<transaction[], transaction>;
  };
};
export const brodcastTransaction = async (transaction: any): Promise<any> => {
  const chain = await createHiveChain();
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
  const chain = await createHiveChain();
  return chain
    .extend<GetListWitnessVotesData>()
    .api.database_api.list_witness_votes({ start: [username, ''], limit, order });
};

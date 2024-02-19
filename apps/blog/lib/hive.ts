import { RCAPI } from '@hiveio/dhive/lib/helpers/rc';
import { RCAccount } from '@hiveio/dhive/lib/chain/rc';
import { Moment } from 'moment';
import { IHiveChainInterface } from '@hive/wax/web';
import { isCommunity, parseAsset, vestsToRshares } from '@/blog/lib/utils';
import { DATA_LIMIT } from '@transaction/lib/bridge';
import { FullAccount } from '@hive/ui/store/app-types';
import { bridgeServer } from '@hive/ui/lib/bridge';
import { getDynamicGlobalProperties, getFeedHistory } from '@hive/ui/lib/hive';
import { IManabarData } from '@hive/wax/web';

export interface TrendingTag {
  comments: number;
  name: string;
  top_posts: number;
  total_payouts: string;
}

export interface DynamicProps {
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

export interface Vote {
  percent: number;
  reputation: number;
  rshares: string;
  time: string;
  timestamp?: number;
  voter: string;
  weight: number;
  reward?: number;
}

export interface RewardFund {
  recent_claims: string;
  reward_balance: string;
}

export interface MarketCandlestickDataItem {
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

export interface TradeDataItem {
  current_pays: string;
  date: number;
  open_pays: string;
}

export interface Post {
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

export const getPost = (username: string, permlink: string): Promise<Post> =>
  bridgeServer.call('condenser_api', 'get_content', [username, permlink]);

export const getMarketBucketSizes = (): Promise<number[]> =>
  bridgeServer.call('condenser_api', 'get_market_history_buckets', []);

export const getMarketHistory = (
  seconds: number,
  startDate: Moment,
  endDate: Moment
): Promise<MarketCandlestickDataItem[]> => {
  let todayEarlier = startDate.format().split('+')[0];
  let todayNow = endDate.format().split('+')[0];
  return bridgeServer.call('condenser_api', 'get_market_history', [seconds, todayEarlier, todayNow]);
};

export const getActiveVotes = (author: string, permlink: string): Promise<Vote[]> =>
  bridgeServer.database.call('get_active_votes', [author, permlink]);

export const getTrendingTags = (afterTag: string = '', limit: number = 250): Promise<string[]> =>
  bridgeServer.database.call('get_trending_tags', [afterTag, limit]).then((tags: TrendingTag[]) => {
    return tags
      .filter((x) => x.name !== '')
      .filter((x) => !isCommunity(x.name))
      .map((x) => x.name);
  });

export const getAllTrendingTags = (
  afterTag: string = '',
  limit: number = 250
): Promise<TrendingTag[] | void> =>
  bridgeServer.database
    .call('get_trending_tags', [afterTag, limit])
    .then((tags: TrendingTag[]) => {
      return tags.filter((x) => x.name !== '').filter((x) => !isCommunity(x.name));
    })
    .catch((reason) => {
      debugger;
    });

export const lookupAccounts = (q: string, limit = 50): Promise<string[]> =>
  bridgeServer.database.call('lookup_accounts', [q, limit]);

export interface Follow {
  follower: string;
  following: string;
  what: string[];
}

export interface GetFollowParams {
  account: string;
  start: string | null;
  type: string;
  limit: number;
}
export const DEFAULT_PARAMS_FOR_FOLLOW: GetFollowParams = {
  account: '',
  start: null,
  type: 'blog',
  limit: 50
};
export const getFollowers = async (params?: Partial<GetFollowParams>): Promise<Follow[]> => {
  try {
    const response = await bridgeServer.call('condenser_api', 'get_followers', [
      params?.account || DEFAULT_PARAMS_FOR_FOLLOW.account,
      params?.start || DEFAULT_PARAMS_FOR_FOLLOW.start,
      params?.type || DEFAULT_PARAMS_FOR_FOLLOW.type,
      params?.limit || DEFAULT_PARAMS_FOR_FOLLOW.limit
    ]);
    return response;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};
export const getFollowing = async (params?: Partial<GetFollowParams>): Promise<Follow[]> => {
  try {
    const response = await bridgeServer.call('condenser_api', 'get_following', [
      params?.account || DEFAULT_PARAMS_FOR_FOLLOW.account,
      params?.start || DEFAULT_PARAMS_FOR_FOLLOW.start,
      params?.type || DEFAULT_PARAMS_FOR_FOLLOW.type,
      params?.limit || DEFAULT_PARAMS_FOR_FOLLOW.limit
    ]);
    return response;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export const findRcAccounts = (username: string): Promise<RCAccount[]> =>
  new RCAPI(bridgeServer).findRCAccounts([username]);

export const getRewardFund = (): Promise<RewardFund> =>
  bridgeServer.database.call('get_reward_fund', ['post']);

export const getDynamicProps = async (): Promise<DynamicProps> => {
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

export const getWithdrawRoutes = (account: string): Promise<WithdrawRoute[]> =>
  bridgeServer.database.call('get_withdraw_routes', [account, 'outgoing']);

export const votingPower = (account: FullAccount): number => {
  // @ts-ignore "Account" is compatible with dhive's "ExtendedAccount"
  const calc = account && bridgeServer.rc.calculateVPMana(account);
  const { percentage } = calc;

  return percentage / 100;
};

export const powerRechargeTime = (power: number) => {
  const missingPower = 100 - power;
  return (missingPower * 100 * 432000) / 10000;
};

export const votingValue = (
  account: FullAccount,
  dynamicProps: DynamicProps,
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

export const rcPower = (account: RCAccount): number => {
  const calc = bridgeServer.rc.calculateRCMana(account);
  const { percentage } = calc;
  return percentage / 100;
};

export interface ConversionRequest {
  amount: string;
  conversion_date: string;
  id: number;
  owner: string;
  requestid: number;
}

export interface CollateralizedConversionRequest {
  collateral_amount: string;
  conversion_date: string;
  converted_amount: string;
  id: number;
  owner: string;
  requestid: number;
}

export const getConversionRequests = (account: string): Promise<ConversionRequest[]> =>
  bridgeServer.database.call('get_conversion_requests', [account]);

export const getCollateralizedConversionRequests = (
  account: string
): Promise<CollateralizedConversionRequest[]> =>
  bridgeServer.database.call('get_collateralized_conversion_requests', [account]);

export interface SavingsWithdrawRequest {
  id: number;
  from: string;
  to: string;
  memo: string;
  request_id: number;
  amount: string;
  complete: string;
}

export const getSavingsWithdrawFrom = (account: string): Promise<SavingsWithdrawRequest[]> =>
  bridgeServer.database.call('get_savings_withdraw_from', [account]);

export interface BlogEntry {
  blog: string;
  entry_id: number;
  author: string;
  permlink: string;
  reblogged_on: string;
}

export const getBlogEntries = (username: string, limit: number = DATA_LIMIT): Promise<BlogEntry[]> =>
  bridgeServer.call('condenser_api', 'get_blog_entries', [username, 0, limit]);

export const brodcastTransaction = (transaction: any): Promise<any> =>
  bridgeServer.call('network_broadcast_api', 'broadcast_transaction', [transaction]);

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

interface Manabars {
  upvote: IManabarData;
  downvote: IManabarData;
  rc: IManabarData;
  upvoteCooldown: Date;
  downvoteCooldown: Date;
  rcCooldown: Date;
}

interface SingleManabar {
  max: string;
  current: string;
  percentageValue: number;
  cooldown: Date;
}

interface Manabar {
  upvote: SingleManabar;
  downvote: SingleManabar;
  rc: SingleManabar;
}
export const getManabars = async (
  accountName: string,
  hiveChain: IHiveChainInterface
): Promise<Manabars | null> => {
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

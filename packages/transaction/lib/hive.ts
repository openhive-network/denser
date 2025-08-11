import { Moment } from 'moment';
import { AccountFollowStats, AccountProfile, FullAccount } from './app-types';
import {
  TWaxApiRequest,
  IManabarData,
  IHiveChainInterface,
  ApiAccount,
  AccountAuthorityUpdateOperation
} from '@hiveio/wax';
import { isCommunity, parseAsset } from '@ui/lib/utils';
import { vestsToRshares } from '@ui/lib/utils';
import { DATA_LIMIT } from './bridge';
import { hiveChainService } from './hive-chain-service';
import { getLogger } from '@ui/lib/logging';
import {
  IVoteListItem,
  IListWitnessVotes,
  ICollateralizedConversionRequest,
  ITrendingTag,
  SavingsWithdrawRequest,
  IConversionRequest,
  WithdrawRoute,
  IRewardFund,
  IFeedHistory,
  IFollow,
  IMarketCandlestickDataItem,
  IAccountReputations,
  IDynamicGlobalProperties,
  IWitnessSchedule,
  BlogEntry,
  IVote,
  IPost,
  Entry
} from './extended-hive.chain';

const logger = getLogger('app');

const chain = await hiveChainService.getHiveChain();

export const getDynamicGlobalProperties = async (): Promise<IDynamicGlobalProperties> => {
  return chain.api.condenser_api.get_dynamic_global_properties([]).then((r: any) => {
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

export const getAccounts = async (usernames: string[]): Promise<FullAccount[]> => {
  return chain.api.condenser_api.get_accounts([usernames]).then((resp: any[]): FullAccount[] =>
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
        governance_vote_expiration_ts: x.governance_vote_expiration_ts,
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

export const getFindAccounts = (username: string): Promise<{ accounts: ApiAccount[] }> => {
  return chain.api.database_api.find_accounts({ accounts: [username], delayed_votes_active: false });
};

export const getFeedHistory = async (): Promise<IFeedHistory> => {
  return chain.api.database_api.get_feed_history();
};

export const getFollowCount = async (username: string): Promise<AccountFollowStats> => {
  return chain.api.condenser_api.get_follow_count([username]);
};

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

export interface ITradeDataItem {
  current_pays: string;
  date: number;
  open_pays: string;
}

export const getPost = async (username: string, permlink: string): Promise<IPost> => {
  return chain.api.condenser_api.get_content([username, permlink]);
};

export const getAccountReputations = async (
  account_lower_bound: string,
  limit: number
): Promise<IAccountReputations[]> => {
  return chain.api.condenser_api.get_account_reputations({ account_lower_bound, limit });
};

type GetMarketBucketSizesData = {
  condenser_api: {
    get_market_history_buckets: TWaxApiRequest<void[], number[]>;
  };
};

export const getMarketBucketSizes = async (): Promise<number[]> => {
  return chain.api.condenser_api.get_market_history_buckets([]);
};

export const getMarketHistory = async (
  seconds: number,
  startDate: Moment,
  endDate: Moment
): Promise<IMarketCandlestickDataItem[]> => {
  let todayEarlier: string = startDate.format().split('+')[0];
  let todayNow: string = endDate.format().split('+')[0];
  return chain.api.condenser_api.get_market_history([seconds, todayEarlier, todayNow]);
};

export const getActiveVotes = async (author: string, permlink: string): Promise<IVote[]> => {
  return chain.api.condenser_api.get_active_votes([author, permlink]);
};

export const getTrendingTags = async (afterTag: string = '', limit: number = 250): Promise<string[]> => {
  return chain.api.database_api.get_trending_tags([afterTag, limit]).then((tags: ITrendingTag[]) => {
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
  return chain.api.database_api
    .get_trending_tags([afterTag, limit])
    .then((tags: ITrendingTag[]) => {
      return tags.filter((x) => x.name !== '').filter((x) => !isCommunity(x.name));
    })
    .catch((reason) => {
      debugger;
    });
};

export const lookupAccounts = async (q: string, limit = 50): Promise<string[]> => {
  return chain.api.database_api.lookup_accounts([q, limit]);
};

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

export const getFollowers = async (params?: Partial<IGetFollowParams>): Promise<IFollow[]> => {
  try {
    return chain.api.condenser_api.get_followers([
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

export const getFollowing = async (params?: Partial<IGetFollowParams>): Promise<IFollow[]> => {
  try {
    return chain.api.condenser_api.get_following([
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

export const getRewardFund = async (): Promise<IRewardFund> => {
  return chain.api.database_api.get_reward_fund(['post']);
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

export const getWithdrawRoutes = async (account: string): Promise<WithdrawRoute[]> => {
  return chain.api.database_api.get_withdraw_routes([account, 'outgoing']);
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

export const getConversionRequests = async (account: string): Promise<IConversionRequest[]> => {
  return chain.api.database_api.get_conversion_requests([account]);
};

export const getCollateralizedConversionRequests = async (
  account: string
): Promise<ICollateralizedConversionRequest[]> => {
  return chain.api.database_api.get_collateralized_conversion_requests([account]);
};

export const getSavingsWithdrawFrom = async (account: string): Promise<SavingsWithdrawRequest[]> => {
  return chain.api.database_api.get_savings_withdraw_from([account]);
};

export const getBlogEntries = async (username: string, limit: number = DATA_LIMIT): Promise<BlogEntry[]> => {
  return chain.api.condenser_api.get_blog_entries([username, 0, limit]);
};

/**
 * Returns list of accounts that reblogged given post, defined by tuple
 * `[author: string, permlink: string]`.
 *
 * @param author
 * @param permlink
 * @returns
 */
export const getRebloggedBy = async (author: string, permlink: string): Promise<string[]> => {
  return chain.api.condenser_api.get_reblogged_by([author, permlink]);
};

export const brodcastTransaction = async (transaction: any): Promise<any> => {
  return chain.api.network_broadcast_api.broadcast_transaction([transaction]);
};

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

export const getListWitnessVotes = async (
  username: string,
  limit: number,
  order: string
): Promise<IListWitnessVotes> => {
  return chain.api.database_api.list_witness_votes({ start: [username, ''], limit, order });
};

// See https://developers.hive.io/apidefinitions/#database_api.list_votes
export const getListVotesByCommentVoter = async (
  start: [string, string, string] | null, // should be [author, permlink, voter]
  limit: number
): Promise<{ votes: IVoteListItem[] }> => {
  return chain.api.database_api.list_votes({ start, limit, order: 'by_comment_voter' });
};

export const getListVotesByVoterComment = async (
  start: [string, string, string] | null, // should be [voter, author, permlink]
  limit: number
): Promise<{ votes: IVoteListItem[] }> => {
  return chain.api.database_api.list_votes({ start, limit, order: 'by_voter_comment' });
};

export const getAuthority = async (username: string): Promise<AccountAuthorityUpdateOperation> => {
  const chain = await hiveChainService.getHiveChain();
  const operation = await AccountAuthorityUpdateOperation.createFor(chain, username);

  return operation;
};
export interface TransactionOptions {
  observe?: boolean;
}
export type LevelAuthority = Parameters<
  Awaited<ReturnType<(typeof AccountAuthorityUpdateOperation)['createFor']>>['role']
>[0];

const keyTypes = ['active', 'owner', 'posting', 'memo'] as const;

export const getPrivateKeys = async (
  username: string,
  password: string
): Promise<
  {
    type: (typeof keyTypes)[number];
    privateKey: string;
    correctKey: boolean;
  }[]
> => {
  const chain = await hiveChainService.getHiveChain();
  const keys = await Promise.all(
    keyTypes.map(async (keyType) => {
      const key = await chain.getPrivateKeyFromPassword(username, keyType, password);
      const operation = (await AccountAuthorityUpdateOperation.createFor(chain, username)).role(keyType);
      const checkKey =
        operation.level === 'memo'
          ? operation.value === key.associatedPublicKey
          : operation.has(key.associatedPublicKey);
      return { type: keyType, privateKey: key.wifPrivateKey, correctKey: checkKey };
    })
  );
  return keys;
};

export const getWitnessSchedule = async (): Promise<IWitnessSchedule> => {
  return chain.api.condenser_api.get_witness_schedule([]);
};

export const getByText = async ({
  pattern,
  sort = 'relevance',
  author = '',
  limit = DATA_LIMIT,
  observer,
  start_author = '',
  start_permlink = ''
}: SearchType): Promise<Entry[]> => {
  return chain.api['search-api'].find_text({
    pattern,
    sort,
    author,
    limit,
    observer,
    start_author,
    start_permlink
  });
};
export interface SearchType {
  pattern: string;
  sort?: string;
  author?: string;
  limit?: number;
  observer?: string;
  start_author?: string;
  start_permlink?: string;
}

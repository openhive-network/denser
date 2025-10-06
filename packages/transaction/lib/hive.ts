import { AccountFollowStats, AccountProfile, FullAccount } from './app-types';
import { IManabarData, ApiAccount, AccountAuthorityUpdateOperation } from '@hiveio/wax';
import { hiveChainService } from './hive-chain-service';
import { getLogger } from '@ui/lib/logging';
import {
  IVoteListItem,
  IListWitnessVotes,
  IFeedHistory,
  IFollow,
  IAccountReputations,
  IDynamicGlobalProperties,
  IVote,
  IPost,
  Entry
} from './extended-hive.chain';
import { DATA_LIMIT } from './bridge';

const logger = getLogger('app');

const chain = await hiveChainService.getHiveChain();

export const getDynamicGlobalProperties = async (): Promise<IDynamicGlobalProperties> => {
  return chain.api.database_api.get_dynamic_global_properties({}).then((r: any) => {
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

export const getFollowCount = async (account: string): Promise<AccountFollowStats> => {
  return chain.api.follow_api.get_follow_count({ account });
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

export const getPost = async (username: string, permlink: string): Promise<IPost> => {
  return chain.api.condenser_api.get_content([username, permlink]);
};

export const getAccountReputations = async (
  account_lower_bound: string,
  limit: number
): Promise<IAccountReputations[]> => {
  return chain.api.condenser_api.get_account_reputations({ account_lower_bound, limit });
};

export const getActiveVotes = async (author: string, permlink: string): Promise<IVote[]> => {
  return chain.api.condenser_api.get_active_votes([author, permlink]);
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
export const getManabars = async (accountName: string): Promise<IManabars | null> => {
  try {
    const upvoteCooldownPromise = chain.calculateManabarFullRegenerationTimeForAccount(accountName, 0);
    const downvoteCooldownPromise = chain.calculateManabarFullRegenerationTimeForAccount(accountName, 1);
    const rcCooldownPromise = chain.calculateManabarFullRegenerationTimeForAccount(accountName, 2);
    const upvotePromise = chain.calculateCurrentManabarValueForAccount(accountName, 0);
    const downvotePromise = chain.calculateCurrentManabarValueForAccount(accountName, 1);
    const rcPromise = chain.calculateCurrentManabarValueForAccount(accountName, 2);
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
export const getManabar = async (accountName: string): Promise<Manabar | null> => {
  const manabars = await getManabars(accountName!);
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

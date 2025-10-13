import { AccountFollowStats } from './app-types';
import { ApiAccount, AccountAuthorityUpdateOperation } from '@hiveio/wax';
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

export const getFindAccounts = (username: string): Promise<{ accounts: ApiAccount[] }> => {
  return chain.api.database_api.find_accounts({ accounts: [username], delayed_votes_active: false });
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

export const getListWitnessVotes = async (
  username: string,
  limit: number,
  order: string
): Promise<IListWitnessVotes> => {
  return chain.api.database_api.list_witness_votes({ start: [username, ''], limit, order });
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

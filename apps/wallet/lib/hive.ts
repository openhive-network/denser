import Big from 'big.js';
import { AccountHistory } from '@/wallet/store/app-types';
import { makeBitMaskFilter, operationOrders } from '@hiveio/dhive/lib/utils';
import moment from 'moment';
import {
  TWaxApiRequest,
  RcAccount,
  asset,
  GetDynamicGlobalPropertiesResponse,
  GetDynamicGlobalPropertiesRequest
} from '@hiveio/wax';
import { hiveChainService } from '@transaction/lib/hive-chain-service';

const chain = await hiveChainService.getHiveChain();

export declare type Bignum = string;

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

export type ProposalData = Omit<IProposal, 'daily_pay' | 'total_votes'> & {
  total_votes: Big;
  daily_pay: { amount: Big };
};
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

type GetWitnessesByVoteData = {
  condenser_api: {
    get_witnesses_by_vote: TWaxApiRequest<(string | number)[], IWitness[]>;
  };
};

export const getWitnessesByVote = async (from: string, limit: number): Promise<IWitness[]> => {
  return chain.api.condenser_api.get_witnesses_by_vote([from, limit]);
};

type GetFindRcAccountsData = {
  rc_api: {
    find_rc_accounts: TWaxApiRequest<string[], { rc_accounts: RcAccount[] }>;
  };
};

export const findRcAccounts = async (username: string): Promise<{ rc_accounts: RcAccount[] }> => {
  return chain.api.rc_api.find_rc_accounts({ accounts: [username] });
};

export const DEFAULT_PARAMS_FOR_PROPOSALS: IGetProposalsParams = {
  start: [],
  limit: 30,
  order: 'by_total_votes',
  order_direction: 'descending',
  status: 'votable'
};
export interface IGetProposalsParams {
  start: Array<number | string>;
  limit: number;
  order: 'by_creator' | 'by_total_votes' | 'by_start_date' | 'by_end_date';
  order_direction: 'descending' | 'ascending';
  status: 'all' | 'inactive' | 'active' | 'votable' | 'expired';
  last_id?: number;
}
type GetProposalsData = {
  database_api: {
    list_proposals: TWaxApiRequest<Partial<IGetProposalsParams>, { proposals: IProposal[] }>;
  };
};

export const getProposals = async (params?: Partial<IGetProposalsParams>): Promise<IProposal[]> => {
  try {
    const response = await chain.api.database_api.list_proposals({
      ...DEFAULT_PARAMS_FOR_PROPOSALS,
      ...params
    });
    return response.proposals;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

export interface IListItemProps {
  proposalData: ProposalData;
  totalShares: Big;
  totalVestingFund: Big;
}

type GetVestingDelegationsData = {
  condenser_api: {
    get_vesting_delegations: TWaxApiRequest<(string | number)[], IDelegatedVestingShare[]>;
  };
};

export const getVestingDelegations = async (
  username: string,
  from: string = '',
  limit: number = 50
): Promise<IDelegatedVestingShare[]> => {
  return chain
    .api.condenser_api.get_vesting_delegations([username, from, limit]);
};

export interface IDelegatedVestingShare {
  id: number;
  delegatee: string;
  delegator: string;
  min_delegation_time: string;
  vesting_shares: string;
}
const op = operationOrders;
const wallet_operations_bitmask = makeBitMaskFilter([
  op.transfer,
  op.transfer_to_vesting,
  op.withdraw_vesting,
  op.interest,
  op.liquidity_reward,
  op.transfer_to_savings,
  op.transfer_from_savings,
  op.escrow_transfer,
  op.cancel_transfer_from_savings,
  op.escrow_approve,
  op.escrow_dispute,
  op.escrow_release,
  op.fill_convert_request,
  op.fill_order,
  op.claim_reward_balance
]);

type GetAccountHistoryData = {
  condenser_api: {
    get_account_history: TWaxApiRequest<(string | number)[], AccountHistory[]>;
  };
};

export const getAccountHistory = async (
  username: string,
  start: number = -1,
  limit: number = 20
): Promise<AccountHistory[]> => { 
  return chain
    .api.condenser_api.get_account_history([username, start, limit, ...wallet_operations_bitmask]) as Promise<AccountHistory[]>;
};

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
type AccountRewardsHistory = [
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
type GetAccountRewardsHistoryData = {
  condenser_api: {
    get_account_history: TWaxApiRequest<(string | number)[], AccountRewardsHistory[]>;
  };
};
const wallet_rewards_history_bitmask = makeBitMaskFilter([op.author_reward, op.curation_reward]);

export const getAccountRewardsHistory = async (
  username: string,
  start: number = -1,
  limit: number = 20
): Promise<AccountRewardsHistory[]> => {
  return chain
    .api.condenser_api.get_account_history([username, start, limit, ...wallet_rewards_history_bitmask]) as Promise<AccountRewardsHistory[]>;
};
export interface IProposalVote {
  id: number;
  proposal: IProposal;
  voter: string;
}

type GetProposalVotesData = {
  condenser_api: {
    list_proposal_votes: TWaxApiRequest<(string | number | (string | number)[])[], IProposalVote[]>;
  };
};

export const getProposalVotes = async (
  proposalId: number,
  voter: string = '',
  limit: number = 1000
): Promise<IProposalVote[]> => {
  return chain
    .api.condenser_api.list_proposal_votes([[proposalId, voter], limit, 'by_proposal_voter'])
    .then((r) => r.filter((x: IProposalVote) => x.proposal.proposal_id === proposalId));
};
export interface IMarketStatistics {
  hbd_volume: string;
  highest_bid: string;
  hive_volume: string;
  latest: string;
  lowest_ask: string;
  percent_change: string;
}

type GetMarketStatisticsData = {
  condenser_api: {
    get_ticker: TWaxApiRequest<void[], IMarketStatistics>;
  };
};

export const getMarketStatistics = async (): Promise<IMarketStatistics> => {
  return chain.api.condenser_api.get_ticker([]);
};

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

type GetOrderBookData = {
  condenser_api: {
    get_order_book: TWaxApiRequest<number[], IOrdersData>;
  };
};

export const getOrderBook = async (limit: number = 500): Promise<IOrdersData> => {
  return chain.api.condenser_api.get_order_book([limit]);
};

type GetOpenOrderData = {
  condenser_api: {
    get_open_orders: TWaxApiRequest<string[], IOpenOrdersData[]>;
  };
};

export const getOpenOrder = async (user: string): Promise<IOpenOrdersData[]> => {
  return chain.api.condenser_api.get_open_orders([user]);
};

type GetTradeHistoryData = {
  condenser_api: {
    get_trade_history: TWaxApiRequest<(string | number)[], IOrdersDataItem[]>;
  };
};

export const getTradeHistory = async (limit: number = 1000): Promise<IOrdersDataItem[]> => {
  let todayEarlier = moment(Date.now()).subtract(10, 'h').format().split('+')[0];
  let todayNow = moment(Date.now()).format().split('+')[0];
  return chain
    .api.condenser_api.get_trade_history([todayEarlier, todayNow, limit]);
};
export interface IRecentTradesData {
  date: string;
  current_pays: string;
  open_pays: string;
}

type GetRecentTradesyData = {
  condenser_api: {
    get_recent_trades: TWaxApiRequest<number[], IRecentTradesData[]>;
  };
};

export const getRecentTrades = async (limit: number = 1000): Promise<IRecentTradesData[]> => {
  return chain.api.condenser_api.get_recent_trades([limit]);
};

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

type GetSavingsWithdrawalsData = {
  database_api: {
    find_savings_withdrawals: TWaxApiRequest<{ account: string }, SavingsWithdrawals>;
  };
};

export const getSavingsWithdrawals = async (account: string): Promise<SavingsWithdrawals> => {
  return chain
    .api.database_api.find_savings_withdrawals({ account: account });
};

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

type GetOwnerHistoryData = {
  condenser_api: {
    get_owner_history: TWaxApiRequest<string[], OwnerHistory>;
  };
};

export const getOwnerHistory = async (account: string): Promise<OwnerHistory> => {
  return chain.api.condenser_api.get_owner_history([account]);
};

interface GetDynamicGlobalProperties {
  database_api: {
    get_dynamic_global_properties: TWaxApiRequest<
      GetDynamicGlobalPropertiesRequest,
      GetDynamicGlobalPropertiesResponse
    >;
  };
}

export const getDynamicGlobalPropertiesData = async (): Promise<GetDynamicGlobalPropertiesResponse> => {
  return chain.api.database_api.get_dynamic_global_properties({});
};

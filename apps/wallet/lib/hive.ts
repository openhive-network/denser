import Big from 'big.js';
import { makeBitMaskFilter, operationOrders } from '@hiveio/dhive/lib/utils';
import moment from 'moment';
import { TWaxApiRequest, RcAccount, GetDynamicGlobalPropertiesResponse } from '@hiveio/wax';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import {
  SavingsWithdrawals,
  IProposal,
  IGetProposalsParams,
  IProposalVote,
  AccountHistory,
  AccountRewardsHistory,
  IDelegatedVestingShare,
  OwnerHistory,
  IRecentTradesData,
  IOrdersDataItem,
  IOpenOrdersData,
  IOrdersData,
  IMarketStatistics,
  IWitness
} from '@transaction/lib/extended-hive.chain';

const chain = await hiveChainService.getHiveChain();

export declare type Bignum = string;

export type ProposalData = Omit<IProposal, 'daily_pay' | 'total_votes'> & {
  total_votes: Big;
  daily_pay: { amount: Big };
};

export const getWitnessesByVote = async (from: string, limit: number): Promise<IWitness[]> => {
  return chain.api.condenser_api.get_witnesses_by_vote([from, limit]);
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

export const getVestingDelegations = async (
  username: string,
  from: string = '',
  limit: number = 50
): Promise<IDelegatedVestingShare[]> => {
  return chain.api.condenser_api.get_vesting_delegations([username, from, limit]);
};

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

export const getAccountHistory = async (
  username: string,
  start: number = -1,
  limit: number = 20
): Promise<AccountHistory[]> => {
  return chain.api.condenser_api.get_account_history([
    username,
    start,
    limit,
    ...wallet_operations_bitmask
  ]) as Promise<AccountHistory[]>;
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
const wallet_rewards_history_bitmask = makeBitMaskFilter([op.author_reward, op.curation_reward]);

export const getAccountRewardsHistory = async (
  username: string,
  start: number = -1,
  limit: number = 20
): Promise<AccountRewardsHistory[]> => {
  return chain.api.condenser_api.get_account_history([
    username,
    start,
    limit,
    ...wallet_rewards_history_bitmask
  ]) as Promise<AccountRewardsHistory[]>;
};

export const getProposalVotes = async (
  proposalId: number,
  voter: string = '',
  limit: number = 1000
): Promise<IProposalVote[]> => {
  return chain.api.condenser_api
    .list_proposal_votes([[proposalId, voter], limit, 'by_proposal_voter'])
    .then((r) => r.filter((x: IProposalVote) => x.proposal.proposal_id === proposalId));
};

export const getMarketStatistics = async (): Promise<IMarketStatistics> => {
  return chain.api.condenser_api.get_ticker([]);
};

export const getOrderBook = async (limit: number = 500): Promise<IOrdersData> => {
  return chain.api.condenser_api.get_order_book([limit]);
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
  return chain.api.condenser_api.get_trade_history([todayEarlier, todayNow, limit]);
};

export const getRecentTrades = async (limit: number = 1000): Promise<IRecentTradesData[]> => {
  return chain.api.condenser_api.get_recent_trades([limit]);
};

export const getSavingsWithdrawals = async (account: string): Promise<SavingsWithdrawals> => {
  return chain.api.database_api.find_savings_withdrawals({ account: account });
};

export const getOwnerHistory = async (account: string): Promise<OwnerHistory> => {
  return chain.api.condenser_api.get_owner_history([account]);
};

export const getDynamicGlobalPropertiesData = async (): Promise<GetDynamicGlobalPropertiesResponse> => {
  return chain.api.database_api.get_dynamic_global_properties({});
};

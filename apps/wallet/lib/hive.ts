import Big from 'big.js';
import moment from 'moment';
import {
  TWaxApiRequest,
  RcAccount,
  GetDynamicGlobalPropertiesResponse,
} from '@hiveio/wax';
import { hiveChainService } from '@transaction/lib/hive-chain-service';
import {
  SavingsWithdrawals,
  IProposal,
  IGetProposalsParams,
  IProposalVote,
  AccountHistory,
  IDelegatedVestingShare,
  OwnerHistory,
  IRecentTradesData,
  IOrdersDataItem,
  IOpenOrdersData,
  IOrdersData,
  IMarketStatistics,
  IWitness,
  IDirectDelegation,
  IGetOperationsByAccountResponse,
  HiveOperation,
  HiveOpTypeSchema,
} from '@transaction/lib/extended-hive.chain';
import { commonVariables } from '@ui/lib/common-variables';

const chain = await hiveChainService.getHiveChain();

export declare type Bignum = string;

export type ProposalData = Omit<IProposal, 'daily_pay' | 'total_votes'> & {
  total_votes: Big;
  daily_pay: { amount: Big };
};

export const getOpTypes = async (): Promise<HiveOpTypeSchema[]> => {
  return await chain.restApi['hafah-api']['operation-types']();
}

export const getWitnessesByVote = async (from: string, limit: number): Promise<IWitness[]> => {
  return chain.api.condenser_api.get_witnesses_by_vote([from, limit]);
};

export const findRcAccounts = async (username: string): Promise<{ rc_accounts: RcAccount[] }> => {
  return chain.api.rc_api.find_rc_accounts({ accounts: [username] });
};

export const getDirectDelegations = async (account: string): Promise<IDirectDelegation> => {
  return chain.api.rc_api.list_rc_direct_delegations({ limit: 1000, start: [account, ''] });
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
    throw error;
  }
};

export interface IListItemProps {
  proposalData: ProposalData;
  totalShares: Big;
  totalVestingFund: Big;
  voted: boolean;
}

export const getVestingDelegations = async (
  username: string,
  from: string = '',
  limit: number = 50
): Promise<IDelegatedVestingShare[]> => {
  return chain.api.condenser_api.get_vesting_delegations([username, from, limit]);
};

const walletOperations = [
  'transfer_operation',
  'transfer_to_vesting_operation',
  'withdraw_vesting_operation',
  'interest_operation',
  'liquidity_reward_operation',
  'transfer_to_savings_operation',
  'transfer_from_savings_operation',
  'escrow_transfer_operation',
  'cancel_transfer_from_savings_operation',
  'escrow_approve_operation',
  'escrow_dispute_operation',
  'escrow_release_operation',
  'fill_convert_request_operation',
  'fill_order_operation',
  'claim_reward_balance_operation'
];

export const getAccountHistory = async (
  username: string,
  start: number = -1,
  limit: number = 20
): Promise<AccountHistory[]> => {
  const opTypes = await getOpTypes();
  const operationTypesIds = walletOperations.map((operationName) => opTypes.find((opType) => opType.operation_name === operationName)?.op_type_id.toString() || '');
  console.log('SHOW ME THIS', operationTypesIds);

  return chain.api.condenser_api.get_account_history([
    username,
    start,
    limit,
    ...(operationTypesIds || [])
  ]) as Promise<AccountHistory[]>;
};

export const getAccountOperations = async (
  username: string,
  page: number | undefined = undefined,
  pageSize: number = 500,
  observer: string
): Promise<IGetOperationsByAccountResponse> => {
  const opTypes = await getOpTypes();
  const operationTypesIds = walletOperations.map((operationName) => opTypes.find((opType) => opType.operation_name === operationName)?.op_type_id.toString() || '');
  return chain.restApi['hivemind-api'].accountsOperations({
    "account-name": username,
    page,
    "page-size": pageSize,
    "operation-types": operationTypesIds.toString(),
    'observer-name': observer !== '' ? observer : commonVariables.defaultObserver
  })
}

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

export const getRestApiAccountRewardsHistory = async (
  username: string,
  op_type: 'author_reward_operation' | 'curation_reward_operation',
  limit: number = 20
): Promise<HiveOperation[]> => {
  const opTypes = await chain.restApi['hafah-api']['operation-types']();
  const opTypeId = opTypes.find((opType) => opType.operation_name === op_type)?.op_type_id;
  const operations = (await chain.restApi['hivemind-api'].accountsOperations({'account-name': username,  'operation-types': opTypeId?.toString(), "page-size": limit})).operations_result;
  return operations;
}

export const getProposalVotes = async (
  proposalId: number,
  voter: string = '',
  limit: number = 1000
): Promise<IProposalVote[]> => {
  return chain.api.condenser_api
    .list_proposal_votes([[proposalId, voter], limit, 'by_proposal_voter'])
    .then((r) => r.filter((x: IProposalVote) => x.proposal.proposal_id === proposalId));
};

export const getUserVotes = async (voter: string, limit: number = 1000): Promise<IProposalVote[]> => {
  return chain.api.condenser_api
    .list_proposal_votes([[voter], limit, 'by_voter_proposal'])
    .then((r) => r.filter((x: IProposalVote) => x.voter === voter));
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

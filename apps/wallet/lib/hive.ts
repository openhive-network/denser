import { bridgeServer } from "@ui/lib/bridge";
import Big from "big.js";
import { AccountHistory } from "@/wallet/store/app-types";
import { makeBitMaskFilter, operationOrders } from "@hiveio/dhive/lib/utils";

export interface Witness {
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
  };
  available_witness_account_subsidies: number;
  running_version: string;
  owner: string;
  signing_key: string;
  last_hbd_exchange_update: string;
  votes: number;
  last_confirmed_block_num: number;
}
export const getWitnessesByVote = (
  from: string,
  limit: number
): Promise<Witness[]> =>
  bridgeServer.call("condenser_api", "get_witnesses_by_vote", [from, limit]);

export const DEFAULT_PARAMS_FOR_PROPOSALS: GetProposalsParams = {
  start: [],
  limit: 30,
  order: "by_total_votes",
  order_direction: "descending",
  status: "votable",
};
export interface GetProposalsParams {
  start: Array<number | string>;
  limit: number;
  order: "by_creator" | "by_total_votes" | "by_start_date" | "by_end_date";
  order_direction: "descending" | "ascending";
  status: "all" | "inactive" | "active" | "votable" | "expired";
  last_id?: number;
}
export const getProposals = async (
  params?: Partial<GetProposalsParams>
): Promise<Proposal[]> => {
  try {
    const response = await bridgeServer.call("database_api", "list_proposals", {
      ...DEFAULT_PARAMS_FOR_PROPOSALS,
      ...params,
    });
    return response.proposals;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
};
export interface Proposal {
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
export interface ListItemProps {
  proposalData: Omit<Proposal, "daily_pay" | "total_votes"> & {
    total_votes: Big;
    daily_pay: { amount: Big };
  };
  totalShares: Big;
  totalVestingFund: Big;
}
export const getVestingDelegations = (
  username: string,
  from: string = "",
  limit: number = 50
): Promise<DelegatedVestingShare[]> =>
  bridgeServer.database.call("get_vesting_delegations", [
    username,
    from,
    limit,
  ]);
export interface DelegatedVestingShare {
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
  op.claim_reward_balance,
]);
export const getAccountHistory = (
  username: string,
  start: number = -1,
  limit: number = 20
): Promise<AccountHistory[]> =>
  bridgeServer.call("condenser_api", "get_account_history", [
    username,
    start,
    limit,
    ...wallet_operations_bitmask,
  ]);

import type { InterceptedBroadcast } from '../../../../../playwright/support/broadcast/interceptor.ts';
import { expectSingleOperation, type NaiAsset } from '../../../../../playwright/support/broadcast/operations.ts';

/**
 * Assertions on the one operation of a wallet broadcast captured by broadcastInterceptor.ts. Each
 * takes every field of the operation, as wax's API JSON carries it (assets as NAI objects; build
 * them with `naiAsset('1.000 HIVE')`), and fails on a missing, extra or different field.
 */

export { naiAsset, type NaiAsset } from '../../../../../playwright/support/broadcast/operations.ts';

type Expect<T> = (call: InterceptedBroadcast, expected: T) => void;

const operation =
  <T extends object>(type: string): Expect<T> =>
  (call, expected) =>
    expectSingleOperation(call, type, expected);

export interface TransferOperationExpectations {
  from: string;
  to: string;
  amount: NaiAsset;
  memo: string;
}
export const expectTransferOperation = operation<TransferOperationExpectations>('transfer_operation');

export interface RecurrentTransferOperationExpectations extends TransferOperationExpectations {
  /** Hours between executions. */
  recurrence: number;
  executions: number;
  extensions: unknown[];
}
export const expectRecurrentTransferOperation = operation<RecurrentTransferOperationExpectations>(
  'recurrent_transfer_operation'
);

export interface TransferToVestingOperationExpectations {
  from: string;
  to: string;
  amount: NaiAsset;
}
export const expectTransferToVestingOperation = operation<TransferToVestingOperationExpectations>(
  'transfer_to_vesting_operation'
);

export interface WithdrawVestingOperationExpectations {
  account: string;
  vesting_shares: NaiAsset;
}
export const expectWithdrawVestingOperation = operation<WithdrawVestingOperationExpectations>(
  'withdraw_vesting_operation'
);

export interface DelegateVestingSharesOperationExpectations {
  delegator: string;
  delegatee: string;
  vesting_shares: NaiAsset;
}
export const expectDelegateVestingSharesOperation = operation<DelegateVestingSharesOperationExpectations>(
  'delegate_vesting_shares_operation'
);

export const expectTransferToSavingsOperation = operation<TransferOperationExpectations>(
  'transfer_to_savings_operation'
);

export interface TransferFromSavingsOperationExpectations extends TransferOperationExpectations {
  request_id: number;
}
export const expectTransferFromSavingsOperation = operation<TransferFromSavingsOperationExpectations>(
  'transfer_from_savings_operation'
);

export interface CancelTransferFromSavingsOperationExpectations {
  from: string;
  request_id: number;
}
export const expectCancelTransferFromSavingsOperation = operation<CancelTransferFromSavingsOperationExpectations>(
  'cancel_transfer_from_savings_operation'
);

export interface AccountWitnessVoteOperationExpectations {
  account: string;
  witness: string;
  approve: boolean;
}
export const expectAccountWitnessVoteOperation = operation<AccountWitnessVoteOperationExpectations>(
  'account_witness_vote_operation'
);

export interface AccountWitnessProxyOperationExpectations {
  account: string;
  /** `''` clears the proxy. */
  proxy: string;
}
export const expectAccountWitnessProxyOperation = operation<AccountWitnessProxyOperationExpectations>(
  'account_witness_proxy_operation'
);

export interface UpdateProposalVotesOperationExpectations {
  voter: string;
  /** int64 ids, which wax's API JSON writes as strings. */
  proposal_ids: string[];
  approve: boolean;
  extensions: unknown[];
}
export const expectUpdateProposalVotesOperation = operation<UpdateProposalVotesOperationExpectations>(
  'update_proposal_votes_operation'
);

export interface ClaimRewardBalanceOperationExpectations {
  account: string;
  reward_hive: NaiAsset;
  reward_hbd: NaiAsset;
  reward_vests: NaiAsset;
}
export const expectClaimRewardBalanceOperation = operation<ClaimRewardBalanceOperationExpectations>(
  'claim_reward_balance_operation'
);

export interface LimitOrderCreateOperationExpectations {
  owner: string;
  orderid: number;
  amount_to_sell: NaiAsset;
  min_to_receive: NaiAsset;
  fill_or_kill: boolean;
  /** `YYYY-MM-DDTHH:MM:SS`, UTC. */
  expiration: string;
}
export const expectLimitOrderCreateOperation = operation<LimitOrderCreateOperationExpectations>(
  'limit_order_create_operation'
);

export interface LimitOrderCancelOperationExpectations {
  owner: string;
  orderid: number;
}
export const expectLimitOrderCancelOperation = operation<LimitOrderCancelOperationExpectations>(
  'limit_order_cancel_operation'
);

export interface ConvertOperationExpectations {
  owner: string;
  requestid: number;
  amount: NaiAsset;
}
export const expectConvertOperation = operation<ConvertOperationExpectations>('convert_operation');

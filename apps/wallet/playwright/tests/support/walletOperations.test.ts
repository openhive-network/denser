import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { InterceptedBroadcast } from '../../../../../playwright/support/broadcast/interceptor.ts';
import {
  expectAccountWitnessProxyOperation,
  expectAccountWitnessVoteOperation,
  expectCancelTransferFromSavingsOperation,
  expectClaimRewardBalanceOperation,
  expectConvertOperation,
  expectDelegateVestingSharesOperation,
  expectLimitOrderCancelOperation,
  expectLimitOrderCreateOperation,
  expectRecurrentTransferOperation,
  expectTransferFromSavingsOperation,
  expectTransferOperation,
  expectTransferToSavingsOperation,
  expectTransferToVestingOperation,
  expectUpdateProposalVotesOperation,
  expectWithdrawVestingOperation
} from './walletOperations.ts';

const broadcastOf = (type: string, value: object): InterceptedBroadcast => ({
  method: 'network_broadcast_api.broadcast_transaction',
  params: { max_block_age: -1, trx: { operations: [{ type, value }] } },
  rpcId: 1,
  at: 0
});

interface HelperCase {
  helper: (call: InterceptedBroadcast, expected: never) => void;
  type: string;
  /** The operation's value as wax's toApiJson() writes it. */
  value: Record<string, unknown>;
  /** A field of `value` and a different value for it. */
  mismatch: [string, unknown];
}

const HIVE = { amount: '1000', precision: 3, nai: '@@000000021' };
const HBD = { amount: '1500', precision: 3, nai: '@@000000013' };
const VESTS = { amount: '1000000', precision: 6, nai: '@@000000037' };
const transfer = { from: 'gtg', to: 'bob', amount: HIVE, memo: 'hi' };

const CASES: Record<string, HelperCase> = {
  expectTransferOperation: {
    helper: expectTransferOperation,
    type: 'transfer_operation',
    value: transfer,
    mismatch: ['amount', HBD]
  },
  expectRecurrentTransferOperation: {
    helper: expectRecurrentTransferOperation,
    type: 'recurrent_transfer_operation',
    value: { ...transfer, recurrence: 24, executions: 2, extensions: [] },
    mismatch: ['recurrence', 48]
  },
  expectTransferToVestingOperation: {
    helper: expectTransferToVestingOperation,
    type: 'transfer_to_vesting_operation',
    value: { from: 'gtg', to: 'gtg', amount: HIVE },
    mismatch: ['to', 'bob']
  },
  expectWithdrawVestingOperation: {
    helper: expectWithdrawVestingOperation,
    type: 'withdraw_vesting_operation',
    value: { account: 'gtg', vesting_shares: VESTS },
    mismatch: ['vesting_shares', { ...VESTS, amount: '1000001' }]
  },
  expectDelegateVestingSharesOperation: {
    helper: expectDelegateVestingSharesOperation,
    type: 'delegate_vesting_shares_operation',
    value: { delegator: 'gtg', delegatee: 'bob', vesting_shares: VESTS },
    mismatch: ['delegatee', 'alice']
  },
  expectTransferToSavingsOperation: {
    helper: expectTransferToSavingsOperation,
    type: 'transfer_to_savings_operation',
    value: transfer,
    mismatch: ['memo', '']
  },
  expectTransferFromSavingsOperation: {
    helper: expectTransferFromSavingsOperation,
    type: 'transfer_from_savings_operation',
    value: { ...transfer, request_id: 5 },
    mismatch: ['request_id', 6]
  },
  expectCancelTransferFromSavingsOperation: {
    helper: expectCancelTransferFromSavingsOperation,
    type: 'cancel_transfer_from_savings_operation',
    value: { from: 'gtg', request_id: 0 },
    mismatch: ['request_id', 1]
  },
  expectAccountWitnessVoteOperation: {
    helper: expectAccountWitnessVoteOperation,
    type: 'account_witness_vote_operation',
    value: { account: 'gtg', witness: 'bob', approve: true },
    mismatch: ['approve', false]
  },
  expectAccountWitnessProxyOperation: {
    helper: expectAccountWitnessProxyOperation,
    type: 'account_witness_proxy_operation',
    value: { account: 'gtg', proxy: '' },
    mismatch: ['proxy', 'bob']
  },
  expectUpdateProposalVotesOperation: {
    helper: expectUpdateProposalVotesOperation,
    type: 'update_proposal_votes_operation',
    value: { voter: 'gtg', proposal_ids: ['7'], approve: false, extensions: [] },
    mismatch: ['proposal_ids', [7]]
  },
  expectClaimRewardBalanceOperation: {
    helper: expectClaimRewardBalanceOperation,
    type: 'claim_reward_balance_operation',
    value: {
      account: 'gtg',
      reward_hive: { ...HIVE, amount: '0' },
      reward_hbd: HBD,
      reward_vests: VESTS
    },
    mismatch: ['reward_hbd', '1.500 HBD']
  },
  expectLimitOrderCreateOperation: {
    helper: expectLimitOrderCreateOperation,
    type: 'limit_order_create_operation',
    value: {
      owner: 'gtg',
      orderid: 0,
      amount_to_sell: HIVE,
      min_to_receive: HBD,
      fill_or_kill: false,
      expiration: '2026-10-10T00:00:00'
    },
    mismatch: ['min_to_receive', HIVE]
  },
  expectLimitOrderCancelOperation: {
    helper: expectLimitOrderCancelOperation,
    type: 'limit_order_cancel_operation',
    value: { owner: 'gtg', orderid: 3 },
    mismatch: ['orderid', 4]
  },
  expectConvertOperation: {
    helper: expectConvertOperation,
    type: 'convert_operation',
    value: { owner: 'gtg', requestid: 1, amount: HBD },
    mismatch: ['owner', 'bob']
  }
};

for (const [name, { helper, type, value, mismatch }] of Object.entries(CASES)) {
  const check = helper as (call: InterceptedBroadcast, expected: object) => void;
  const [field, wrong] = mismatch;

  void describe(name, () => {
    void it(`accepts a ${type} with the expected fields`, () => {
      check(broadcastOf(type, value), value);
    });

    void it(`rejects a ${type} with a different ${field}`, () => {
      assert.throws(() => check(broadcastOf(type, { ...value, [field]: wrong }), value), {
        message: new RegExp(`${type}\\.${field}`)
      });
    });

    void it('rejects an operation of another type', () => {
      assert.throws(() => check(broadcastOf('vote_operation', value), value), { message: /operation\.type/ });
    });
  });
}

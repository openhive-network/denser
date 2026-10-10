import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { InterceptedBroadcast } from './interceptor.ts';
import { expectSingleOperation, naiAsset } from './operations.ts';

const HIVE = { amount: '1000', precision: 3, nai: '@@000000021' };
const TRANSFER = { from: 'gtg', to: 'bob', amount: HIVE, memo: 'hi' };

const broadcastOf = (operations: unknown): InterceptedBroadcast => ({
  method: 'network_broadcast_api.broadcast_transaction',
  params: { max_block_age: -1, trx: { operations } },
  rpcId: 1,
  at: 0
});
const transferBroadcast = (value: object) => broadcastOf([{ type: 'transfer_operation', value }]);

describe('naiAsset', () => {
  it('writes legacy amounts as the NAI objects wax broadcasts', () => {
    assert.deepEqual(naiAsset('1.000 HIVE'), HIVE);
    assert.deepEqual(naiAsset('1.500 HBD'), { amount: '1500', precision: 3, nai: '@@000000013' });
    assert.deepEqual(naiAsset('1.000000 VESTS'), { amount: '1000000', precision: 6, nai: '@@000000037' });
    assert.deepEqual(naiAsset('0.001 HIVE'), { ...HIVE, amount: '1' });
  });

  it('refuses an amount not at its precision or of an unknown symbol', () => {
    for (const legacy of ['1 HIVE', '1.0 HIVE', '1.000 VESTS', '1.000 STEEM', '-1.000 HBD']) {
      assert.throws(() => naiAsset(legacy), { message: /Not a HIVE, HBD or VESTS amount/ }, legacy);
    }
  });
});

describe('expectSingleOperation', () => {
  it('accepts the one operation of the given type with exactly the expected fields', () => {
    expectSingleOperation(transferBroadcast(TRANSFER), 'transfer_operation', TRANSFER);
  });

  it('rejects a field of a different value, naming it', () => {
    assert.throws(
      () => expectSingleOperation(transferBroadcast({ ...TRANSFER, amount: { ...HIVE, amount: '1001' } }), 'transfer_operation', TRANSFER),
      { message: /transfer_operation\.amount/ }
    );
  });

  it('rejects a field the expectation lacks, and one the operation lacks', () => {
    assert.throws(
      () => expectSingleOperation(transferBroadcast({ ...TRANSFER, extensions: [] }), 'transfer_operation', TRANSFER),
      { message: /transfer_operation fields/ }
    );
    const { memo: _memo, ...withoutMemo } = TRANSFER;
    assert.throws(() => expectSingleOperation(transferBroadcast(withoutMemo), 'transfer_operation', TRANSFER), {
      message: /transfer_operation fields/
    });
  });

  it('rejects a transaction of more than one operation', () => {
    const op = { type: 'transfer_operation', value: TRANSFER };
    assert.throws(() => expectSingleOperation(broadcastOf([op, op]), 'transfer_operation', TRANSFER), {
      message: /exactly one operation/
    });
  });

  it('rejects a broadcast without a transaction', () => {
    const call = { ...transferBroadcast(TRANSFER), params: {} };
    assert.throws(() => expectSingleOperation(call, 'transfer_operation', TRANSFER), { message: /should include trx/ });
  });
});

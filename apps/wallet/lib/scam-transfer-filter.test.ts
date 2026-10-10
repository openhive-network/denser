import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getHiddenTransferReason, type HiddenSenders } from './scam-transfer-filter.ts';

const ACCOUNT = 'small.minion';
const SCAMMER = 'appreciatorr';
const MUTED = 'muted.account';
const FRIEND = 'friend';
const HIDDEN_SENDERS: HiddenSenders = { badActors: new Set([SCAMMER]), muted: new Set([MUTED, SCAMMER]) };

const hive = { amount: '1000', precision: 3, nai: '@@000000021' };

const operation = (type: string, value: object) => ({ op: { type, value } });
const transfer = (from: string, to: string) =>
  operation('transfer_operation', { from, to, amount: hive, memo: 'claim your reward at https://phish.example' });

// The rows are the API's JSON, which HiveOperation types more strictly (dates, required asset fields).
const reasonFor = (row: object) =>
  (getHiddenTransferReason as (row: object, username: string, senders: HiddenSenders) => string | undefined)(
    row,
    ACCOUNT,
    HIDDEN_SENDERS
  );

describe('getHiddenTransferReason', () => {
  it('hides a transfer from a bad actor to the account as a bad actor one, even when also muted', () => {
    assert.equal(reasonFor(transfer(SCAMMER, ACCOUNT)), 'badActor');
  });

  it('hides a transfer from a muted account to the account as a muted one', () => {
    assert.equal(reasonFor(transfer(MUTED, ACCOUNT)), 'muted');
  });

  it('does not hide a transfer from any other sender', () => {
    assert.equal(reasonFor(transfer(FRIEND, ACCOUNT)), undefined);
  });

  it('does not hide a transfer the account sent to a bad actor or a muted account', () => {
    const outgoing = [transfer(ACCOUNT, SCAMMER), transfer(ACCOUNT, MUTED)];
    assert.deepEqual(outgoing.map(reasonFor), [undefined, undefined]);
  });

  it('does not hide a transfer between two other accounts', () => {
    assert.equal(reasonFor(transfer(SCAMMER, FRIEND)), undefined);
  });

  it('hides the other incoming operations that carry a memo', () => {
    const recurrent = operation('recurrent_transfer_operation', {
      from: SCAMMER,
      to: ACCOUNT,
      amount: hive,
      memo: 'spam',
      recurrence: 24,
      executions: 5
    });
    const toSavings = operation('transfer_to_savings_operation', { from: SCAMMER, to: ACCOUNT, amount: hive, memo: 'spam' });
    assert.deepEqual([recurrent, toSavings].map(reasonFor), ['badActor', 'badActor']);
  });

  it('does not hide operations without a sender', () => {
    const interest = operation('interest_operation', { owner: ACCOUNT, interest: hive });
    assert.deepEqual([interest, { op: undefined }].map(reasonFor), [undefined, undefined]);
  });
});

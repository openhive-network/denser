import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isIncomingFromScamSender } from './scam-transfer-filter.ts';

const ACCOUNT = 'small.minion';
const SCAMMER = 'appreciatorr';
const FRIEND = 'friend';
const SCAM_SENDERS: ReadonlySet<string> = new Set([SCAMMER]);

const hive = { amount: '1000', precision: 3, nai: '@@000000021' };

const operation = (type: string, value: object) => ({ op: { type, value } });
const transfer = (from: string, to: string) =>
  operation('transfer_operation', { from, to, amount: hive, memo: 'claim your reward at https://phish.example' });

// The rows are the API's JSON, which HiveOperation types more strictly (dates, required asset fields).
const isHidden = (row: object) =>
  (isIncomingFromScamSender as (row: object, username: string, senders: ReadonlySet<string>) => boolean)(
    row,
    ACCOUNT,
    SCAM_SENDERS
  );

describe('isIncomingFromScamSender', () => {
  it('matches a transfer from a scam sender to the account', () => {
    assert.equal(isHidden(transfer(SCAMMER, ACCOUNT)), true);
  });

  it('does not match a transfer from any other sender', () => {
    assert.equal(isHidden(transfer(FRIEND, ACCOUNT)), false);
  });

  it('does not match a transfer the account sent to a scam account', () => {
    assert.equal(isHidden(transfer(ACCOUNT, SCAMMER)), false);
  });

  it('does not match a transfer between two other accounts', () => {
    assert.equal(isHidden(transfer(SCAMMER, FRIEND)), false);
  });

  it('matches the other incoming operations that carry a memo', () => {
    const recurrent = operation('recurrent_transfer_operation', {
      from: SCAMMER,
      to: ACCOUNT,
      amount: hive,
      memo: 'spam',
      recurrence: 24,
      executions: 5
    });
    const toSavings = operation('transfer_to_savings_operation', { from: SCAMMER, to: ACCOUNT, amount: hive, memo: 'spam' });
    assert.deepEqual([recurrent, toSavings].map(isHidden), [true, true]);
  });

  it('does not match operations without a sender', () => {
    const interest = operation('interest_operation', { owner: ACCOUNT, interest: hive });
    assert.deepEqual([interest, { op: undefined }].map(isHidden), [false, false]);
  });
});

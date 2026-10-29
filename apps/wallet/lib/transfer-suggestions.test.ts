import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createListWithSuggestions } from './transfer-suggestions.ts';

const ACCOUNT = 'guest4test1';
const hive = (amount: string) => ({ amount, precision: 3, nai: '@@000000021' });

// Rows as hivemind-api `accountsOperations` answers them: op types carry the `_operation` suffix.
const historyRow = (type: string, value: object) => ({
  op: { type, value },
  block: 104486998,
  trx_id: 'e05ba9964b0b8e1cec17ef6adf9d306979d3380b',
  op_pos: 0,
  op_type_id: 2,
  timestamp: '2026-03-09T19:06:18',
  virtual_op: false,
  operation_id: '448768239267217400',
  trx_in_block: 0
});
const transfer = (from: string, to: string) =>
  historyRow('transfer_operation', { from, to, amount: hive('1000'), memo: '' });

// The rows are the API's JSON, which HiveOperation types more strictly (dates, required asset fields).
type Suggest = (username: string, t: (key: string) => string, history?: object[], following?: object[]) =>
  { username: string; about: string }[];
const suggest = createListWithSuggestions as unknown as Suggest;
const t = (key: string) => key;

describe('createListWithSuggestions', () => {
  it('suggests the counterparties of transfers, most frequent first, then followed accounts', () => {
    const history = [
      transfer(ACCOUNT, 'guest4test2'),
      transfer('guest4test4', ACCOUNT),
      transfer(ACCOUNT, 'guest4test4'),
      historyRow('transfer_to_savings_operation', { from: ACCOUNT, to: 'guest4test8', amount: hive('1') }),
      historyRow('author_reward_operation', { author: ACCOUNT, permlink: 'a-post' })
    ];
    const following = [{ follower: ACCOUNT, following: 'alice', what: ['blog'] }];

    assert.deepEqual(suggest(ACCOUNT, t, history, following), [
      { username: 'guest4test4', about: '2 profile.previous_transfers' },
      { username: 'guest4test2', about: '1 profile.previous_transfers' },
      { username: 'guest4test8', about: '1 profile.previous_transfers' },
      { username: 'alice', about: 'profile.following' }
    ]);
  });

  it('skips transfers the account made to itself', () => {
    assert.deepEqual(suggest(ACCOUNT, t, [transfer(ACCOUNT, ACCOUNT)]), []);
  });
});

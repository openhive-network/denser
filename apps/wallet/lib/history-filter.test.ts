import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFilter, resolveFilters } from './history-filter.ts';

const ACCOUNT = 'small.minion';
const TRX_ID = 'e05ba9964b0b8e1cec17ef6adf9d306979d3380b';

const hbd = (amount: string) => ({ amount, precision: 3, nai: '@@000000013' });

// Rows as hivemind-api `accountsOperations` answers them: a cancelled savings withdrawal and the
// interest virtual op the same transaction triggered.
const historyRow = (opPos: number, opTypeId: number, op: { type: string; value: object }) => ({
  op,
  block: 104486998,
  trx_id: TRX_ID,
  op_pos: opPos,
  op_type_id: opTypeId,
  timestamp: '2026-03-09T19:06:18',
  virtual_op: opPos > 0,
  operation_id: `44876823926721740${opPos}`,
  trx_in_block: 0
});

const cancelOp = historyRow(0, 34, {
  type: 'cancel_transfer_from_savings_operation',
  value: { from: ACCOUNT, request_id: 1773083171 }
});
const interestOp = (amount: string) =>
  historyRow(1, 55, {
    type: 'interest_operation',
    value: { owner: ACCOUNT, interest: hbd(amount), is_saved_into_hbd_balance: false }
  });
const smallInterestOp = interestOp('123');
const largeInterestOp = interestOp('1539');

// The filter as account-history.tsx passes it with no checkbox ticked (see use-filters.ts).
const defaultFilter = { search: '', others: true, incoming: true, outcoming: true, exlude: false };

type HistoryRow = ReturnType<typeof historyRow>;

const visibleTypes = (filter: typeof defaultFilter, rows: HistoryRow[]) => {
  // The rows are the API's JSON, which HiveOperation types more strictly (dates, required asset fields).
  const isVisible = getFilter({ filter, username: ACCOUNT }) as (row: object) => boolean;
  return rows.filter(isVisible).map((row) => row.op.type);
};

describe('getFilter on a cancelled savings withdrawal that paid interest', () => {
  it('keeps both operations by default', () => {
    assert.deepEqual(visibleTypes(defaultFilter, [cancelOp, smallInterestOp]), [
      'cancel_transfer_from_savings_operation',
      'interest_operation'
    ]);
  });

  it('hides both when others is off', () => {
    const rows = [cancelOp, smallInterestOp, largeInterestOp];
    assert.deepEqual(visibleTypes({ ...defaultFilter, others: false }, rows), []);
  });

  it('with exclude < 1 on, keeps only interest of at least 1 HBD', () => {
    const filter = { ...defaultFilter, exlude: true };
    assert.deepEqual(visibleTypes(filter, [cancelOp, smallInterestOp]), []);
    assert.deepEqual(visibleTypes(filter, [cancelOp, largeInterestOp]), ['interest_operation']);
  });

  it('with exclude < 1 off, keeps interest below 1 HBD', () => {
    assert.deepEqual(visibleTypes(defaultFilter, [smallInterestOp, largeInterestOp]), [
      'interest_operation',
      'interest_operation'
    ]);
  });

  it('matches the interest owner and the cancelling account in the search', () => {
    assert.deepEqual(visibleTypes({ ...defaultFilter, search: 'minion' }, [cancelOp, largeInterestOp]), [
      'cancel_transfer_from_savings_operation',
      'interest_operation'
    ]);
    const otherAccount = { ...defaultFilter, search: 'someone-else' };
    assert.deepEqual(visibleTypes(otherAccount, [cancelOp, largeInterestOp]), []);
  });
});

const SEARCHED = 'gtg';
const hive = (amount: string) => ({ amount, precision: 3, nai: '@@000000021' });
const vests = (amount: string) => ({ amount, precision: 6, nai: '@@000000037' });

const transferOp = historyRow(0, 2, {
  type: 'transfer_operation',
  value: { from: SEARCHED, to: ACCOUNT, amount: hive('5000'), memo: '' }
});
const claimRewardOp = historyRow(0, 39, {
  type: 'claim_reward_balance_operation',
  value: { account: SEARCHED, reward_hive: hive('0'), reward_hbd: hbd('1000'), reward_vests: vests('0') }
});
const authorRewardOp = historyRow(1, 51, {
  type: 'author_reward_operation',
  value: {
    author: SEARCHED,
    permlink: 'a-post',
    hbd_payout: hbd('2000'),
    hive_payout: hive('0'),
    vesting_payout: vests('1000000')
  }
});
const fillOrderOp = historyRow(1, 57, {
  type: 'fill_order_operation',
  value: {
    current_owner: 'market-maker',
    current_orderid: 1,
    current_pays: hbd('3000'),
    open_owner: SEARCHED,
    open_orderid: 2,
    open_pays: hive('12000')
  }
});
const searchedAccountRows = [transferOp, claimRewardOp, authorRewardOp, fillOrderOp];

// The raw checkbox state account-history.tsx starts from: nothing ticked.
const untickedFilter = { search: '', others: false, incoming: false, outcoming: false, exlude: false };

const visibleTypesFor = (rawFilter: typeof untickedFilter, rows: HistoryRow[]) =>
  visibleTypes(resolveFilters(rawFilter), rows);

describe('getFilter with resolveFilters on a search for an account', () => {
  it('keeps the transfers, rewards and fills naming the searched account', () => {
    assert.deepEqual(visibleTypesFor({ ...untickedFilter, search: SEARCHED }, searchedAccountRows), [
      'transfer_operation',
      'claim_reward_balance_operation',
      'author_reward_operation',
      'fill_order_operation'
    ]);
  });

  it('keeps the rewards with others ticked', () => {
    const filter = { ...untickedFilter, search: SEARCHED, others: true };
    assert.deepEqual(visibleTypesFor(filter, [claimRewardOp, authorRewardOp]), [
      'claim_reward_balance_operation',
      'author_reward_operation'
    ]);
  });

  it('hides the non-transfer operations when only a direction is ticked', () => {
    const filter = { ...untickedFilter, search: SEARCHED, incoming: true };
    assert.deepEqual(visibleTypesFor(filter, searchedAccountRows), ['transfer_operation']);
  });

  it('matches either owner of a filled order', () => {
    const currentOwner = { ...untickedFilter, search: 'market-maker' };
    assert.deepEqual(visibleTypesFor(currentOwner, searchedAccountRows), ['fill_order_operation']);
  });

  it('shows nothing for an unrelated name', () => {
    assert.deepEqual(visibleTypesFor({ ...untickedFilter, search: 'unrelated' }, searchedAccountRows), []);
  });
});

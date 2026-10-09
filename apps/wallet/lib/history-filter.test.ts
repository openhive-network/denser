import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFilter } from './history-filter.ts';

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

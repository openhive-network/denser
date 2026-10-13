import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FINANCIAL_REPORT_OP_TYPES,
  type FinancialReportOpType,
  filterFinancialReportOperations
} from './financial-report.ts';

const NOW = new Date('2026-10-13T12:00:00Z');
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

// hivemind-api returns timestamps as UTC strings without a zone suffix.
const operation = (type: string, timestamp: Date, value: object = {}) => ({
  block: 100000000,
  timestamp: timestamp.toISOString().slice(0, 19),
  virtual_op: true,
  op: { type, value }
});

type Operation = ReturnType<typeof operation>;

const hbd = (amount: string) => ({ amount, precision: 3, nai: '@@000000013' });

const dhfFunding = (timestamp: Date) =>
  operation('dhf_funding_operation', timestamp, { treasury: 'hive.fund', additional_funds: hbd('1000') });
const transfer = (timestamp: Date) =>
  operation('transfer_operation', timestamp, { from: 'alice', to: 'bob', amount: hbd('1'), memo: '' });

const types = (operations: Operation[]) => operations.map(({ op }) => op.type);

describe('filterFinancialReportOperations', () => {
  it('keeps dhf_funding_operation when DHF funding is selected', () => {
    const operations = [dhfFunding(daysAgo(1)), transfer(daysAgo(1))];
    const selected = new Set<FinancialReportOpType>(['dhf_funding_operation']);

    assert.deepEqual(types(filterFinancialReportOperations(operations, selected, 'last7days', NOW)), [
      'dhf_funding_operation'
    ]);
  });

  it('keeps every requested operation type with the default selection', () => {
    const operations = FINANCIAL_REPORT_OP_TYPES.map((type) => operation(type, daysAgo(2)));

    assert.deepEqual(
      types(filterFinancialReportOperations(operations, new Set(FINANCIAL_REPORT_OP_TYPES), 'last7days', NOW)),
      [...FINANCIAL_REPORT_OP_TYPES]
    );
  });

  it('drops operation types that are not selected or not part of the report', () => {
    const operations = [dhfFunding(daysAgo(1)), transfer(daysAgo(1)), operation('sps_fund_operation', daysAgo(1))];
    const selected = new Set<FinancialReportOpType>(['transfer_operation']);

    assert.deepEqual(types(filterFinancialReportOperations(operations, selected, 'last7days', NOW)), [
      'transfer_operation'
    ]);
  });

  it('drops operations older than the selected period', () => {
    const operations = [dhfFunding(daysAgo(6)), dhfFunding(daysAgo(10)), dhfFunding(daysAgo(40))];
    const selected = new Set<FinancialReportOpType>(['dhf_funding_operation']);

    assert.equal(filterFinancialReportOperations(operations, selected, 'last7days', NOW).length, 1);
    assert.equal(filterFinancialReportOperations(operations, selected, 'last14days', NOW).length, 2);
    assert.equal(filterFinancialReportOperations(operations, selected, 'last60days', NOW).length, 3);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Node resolves neither the tsconfig path alias nor an extensionless import:
// point `@ui/…` at the package's TypeScript source.
const UI_ALIAS = '@ui/';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith(UI_ALIAS)) return nextResolve(specifier, context);
    const source = new URL(`../../../../../packages/ui/${specifier.slice(UI_ALIAS.length)}.ts`, import.meta.url);
    return nextResolve(source.href, context);
  }
});

const { toIncomingDelegationRows } = await import('./incoming-delegations.ts');

// 1 000 000 VESTS are worth 545.454 HIVE (180 000 000.000 HIVE behind 330 000 000 000.000000 VESTS).
const CHAIN = {
  total_vesting_fund_hive: { amount: '180000000000', precision: 3, nai: '@@000000021' },
  total_vesting_shares: { amount: '330000000000000000', precision: 6, nai: '@@000000037' },
  head_block_number: 100_000_000,
  time: '2026-10-01T12:00:00'
};

const delegation = (delegator: string, amount: string, blockNum = 100_000_000) => ({
  delegator,
  amount,
  operation_id: '1',
  block_num: blockNum
});

describe('toIncomingDelegationRows', () => {
  it('converts the VESTS satoshi string to HIVE satoshis, rounding toward zero', () => {
    const [row] = toIncomingDelegationRows([delegation('alice', '1000000000000')], CHAIN);
    assert.equal(row.delegator, 'alice');
    assert.equal(row.hiveSatoshis, 545_454n);
  });

  it('converts amounts beyond Number.MAX_SAFE_INTEGER exactly', () => {
    const [row] = toIncomingDelegationRows([delegation('whale', '33000000000000000')], CHAIN);
    assert.equal(row.hiveSatoshis, 18_000_000_000n);
  });

  it('sorts by amount, largest first, comparing amounts as numbers rather than strings', () => {
    const rows = toIncomingDelegationRows(
      [delegation('small', '9000000'), delegation('large', '10000000000'), delegation('medium', '100000000')],
      CHAIN
    );
    assert.deepEqual(
      rows.map((row) => row.delegator),
      ['large', 'medium', 'small']
    );
  });

  it('orders equal amounts by delegator name and leaves the input untouched', () => {
    const input = [delegation('bob', '5000000'), delegation('alice', '5000000')];
    const rows = toIncomingDelegationRows(input, CHAIN);
    assert.deepEqual(
      rows.map((row) => row.delegator),
      ['alice', 'bob']
    );
    assert.equal(input[0].delegator, 'bob');
  });

  it('dates a delegation 3 s per block before the head block time', () => {
    const [row] = toIncomingDelegationRows([delegation('alice', '1000000', 100_000_000 - 28_800)], CHAIN);
    assert.equal(row.since.toISOString(), '2026-09-30T12:00:00.000Z');
  });
});

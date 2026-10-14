import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decimalToSatoshis, vestsToHiveSatoshis, vestsToNearestHiveSatoshis } from './asset-math.ts';

const PRECISION = { HIVE: 3, HBD: 3, VESTS: 6 } as const;

describe('decimalToSatoshis', () => {
  const cases: [string, keyof typeof PRECISION, string][] = [
    ['0.001', 'HIVE', '1'],
    ['0.250', 'HIVE', '250'],
    ['0.25', 'HIVE', '250'],
    ['1', 'HIVE', '1000'],
    ['1.5', 'HIVE', '1500'],
    ['1000.000', 'HIVE', '1000000'],
    ['0', 'HIVE', '0'],
    ['0.001', 'HBD', '1'],
    ['0.250', 'HBD', '250'],
    ['1', 'HBD', '1000'],
    ['1.5', 'HBD', '1500'],
    ['1000.000', 'HBD', '1000000'],
    ['0.000001', 'VESTS', '1'],
    ['0.250000', 'VESTS', '250000'],
    ['1', 'VESTS', '1000000'],
    ['1.5', 'VESTS', '1500000'],
    ['1000.000000', 'VESTS', '1000000000']
  ];

  for (const [value, token, amount] of cases) {
    it(`converts ${value} ${token} to the canonical satoshi amount ${amount}`, () => {
      assert.equal(decimalToSatoshis(value, PRECISION[token]).toString(), amount);
    });
  }
});

describe('vestsToNearestHiveSatoshis', () => {
  // 1 HIVE satoshi (0.001 HIVE) = 1_606_838.5 VESTS satoshis (~1.606838 VESTS) at these totals.
  const FUND = 2n;
  const SHARES = 3_213_677n;

  it('converts an amount entered as 0.001 HIVE back to 0.001 HIVE where rounding down gives 0.000', () => {
    assert.equal(vestsToHiveSatoshis(1_606_838n, FUND, SHARES), 0n);
    assert.equal(vestsToNearestHiveSatoshis(1_606_838n, FUND, SHARES), 1n);
  });

  it('rounds below half a satoshi down and from half a satoshi up', () => {
    assert.equal(vestsToNearestHiveSatoshis(803_419n, FUND, SHARES), 0n);
    assert.equal(vestsToNearestHiveSatoshis(803_420n, FUND, SHARES), 1n);
  });

  it('keeps exact conversions exact', () => {
    assert.equal(vestsToNearestHiveSatoshis(3_213_677_000n, FUND, SHARES), 2_000n);
    assert.equal(vestsToNearestHiveSatoshis(0n, FUND, SHARES), 0n);
  });
});

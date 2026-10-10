import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decimalToSatoshis } from './asset-math.ts';

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

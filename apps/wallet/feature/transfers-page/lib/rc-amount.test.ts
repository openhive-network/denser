import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Big from 'big.js';
import {
  billionsToRawRc,
  formatRcInput,
  formatRcSummary,
  parseRcBillions,
  rawRcToBillions,
  rcForPercent,
  rcPercentOf
} from './rc-amount.ts';

const MAX = rawRcToBillions('5797055662');

describe('RC amounts in billions', () => {
  it('converts raw RC to billions and back without losing a single RC', () => {
    assert.equal(MAX.toString(), '5.797055662');
    assert.equal(billionsToRawRc(MAX), '5797055662');
    assert.equal(billionsToRawRc(new Big('0.0000000019')), '1');
  });

  it('keeps every raw digit in the input value and two decimals in the summary', () => {
    assert.equal(formatRcInput(MAX), '5.797055662');
    assert.equal(formatRcInput(new Big('100')), '100');
    assert.equal(formatRcInput(new Big('0')), '0');
    assert.equal(formatRcSummary(MAX), '5.80');
  });

  it('reads an empty or malformed amount as zero', () => {
    assert.equal(parseRcBillions('').toString(), '0');
    assert.equal(parseRcBillions('.').toString(), '0');
    assert.equal(parseRcBillions('1e3').toString(), '0');
    assert.equal(parseRcBillions('1.5').toString(), '1.5');
  });

  it('takes a percentage of the maximum rounded down to a whole RC', () => {
    assert.equal(rcForPercent(MAX, 25).toString(), '1.449263915');
    assert.equal(rcForPercent(MAX, 100).toString(), MAX.toString());
    assert.equal(rcForPercent(MAX, 0).toString(), '0');
  });

  it('expresses an amount as a percentage of the maximum', () => {
    assert.equal(rcPercentOf(rcForPercent(MAX, 25), MAX), 25);
    assert.equal(rcPercentOf(MAX, MAX), 100);
    assert.equal(rcPercentOf(new Big(1), new Big(0)), 0);
  });
});

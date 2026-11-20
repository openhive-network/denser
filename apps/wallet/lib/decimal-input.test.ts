import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseDecimalInput, toMachineDecimal, withDecimalPoint } from './decimal-input.ts';

describe('amount input with a decimal comma', () => {
  it('reads "1,5" as 1.5, as a decimal point', () => {
    assert.equal(parseDecimalInput('1,5'), 1.5);
    assert.equal(parseDecimalInput('1.5'), 1.5);
    assert.equal(parseDecimalInput(' 0,125 '), 0.125);
    assert.equal(parseDecimalInput(',5'), 0.5);
    assert.equal(parseDecimalInput(2), 2);
  });

  it('keeps the amount in machine format for the chain', () => {
    assert.equal(toMachineDecimal('1,5'), '1.5');
    assert.equal(toMachineDecimal('12'), '12');
    assert.equal(withDecimalPoint('1,'), '1.');
  });

  it('reads an empty or malformed amount as no number', () => {
    assert.ok(Number.isNaN(parseDecimalInput('')));
    assert.ok(Number.isNaN(parseDecimalInput('1,5,0')));
    assert.ok(Number.isNaN(parseDecimalInput('1 000,5')));
    assert.ok(Number.isNaN(parseDecimalInput('abc')));
    assert.equal(toMachineDecimal('1.'), '');
    assert.equal(parseDecimalInput('-1,5'), -1.5);
  });
});

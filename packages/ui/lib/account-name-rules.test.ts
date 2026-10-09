import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkAccountNameFormat, type AccountNameFormatError } from './account-name-rules.ts';

describe('checkAccountNameFormat', () => {
  const validNames = ['abc', 'gtg', 'a--a', 'ab--cd', 'hive-167922', 'abc.efg', 'abc.d-f', 'abcdefghijklmnop'];

  for (const name of validNames) {
    it(`accepts "${name}"`, () => {
      assert.equal(checkAccountNameFormat(name), null);
    });
  }

  const invalidNames: [string, AccountNameFormatError][] = [
    ['', 'empty'],
    ['ab', 'too_short'],
    ['abcdefghijklmnopq', 'too_long'],
    ['a..b', 'segment_too_short'],
    ['ąbc', 'segment_charset'],
    ['Abc', 'segment_charset'],
    ['block_trades', 'segment_charset'],
    ['1abc', 'segment_start'],
    ['-abc', 'segment_start'],
    ['abc.1ef', 'segment_start'],
    ['.abc', 'segment_start'],
    ['abc.', 'segment_start'],
    ['abc-', 'segment_end'],
    ['abc.ef-', 'segment_end'],
    ['abc.de', 'segment_too_short'],
    ['ab.abc', 'segment_too_short']
  ];

  for (const [name, expected] of invalidNames) {
    it(`rejects "${name}" with ${expected}`, () => {
      assert.equal(checkAccountNameFormat(name), expected);
    });
  }
});

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { validateAccountNameFormat } from './validate-hive-account';

describe('validateAccountNameFormat', () => {
  describe('accepts valid Hive account names', () => {
    const validNames = ['gtg', 'blocktrades', 'guest4test', 'hive-167922', 'abc.def', 'abcdefghijklmnop', 'ab--cd'];

    for (const name of validNames) {
      it(`accepts "${name}"`, () => {
        expect(validateAccountNameFormat(name)).to.equal(true);
      });
    }
  });

  describe('rejects invalid Hive account names', () => {
    const invalidNames: Array<[string, string]> = [
      ['too short', 'ab'],
      ['too long (17 chars)', 'abcdefghijklmnopq'],
      ['starts with a digit', '1abc'],
      ['starts with a hyphen', '-abc'],
      ['contains uppercase', 'Blocktrades'],
      ['contains an underscore', 'block_trades'],
      ['contains other characters', 'block@trades'],
      ['contains consecutive dots', 'a..b'],
      ['ends with a dot', 'abcd.'],
      ['ends with a hyphen', 'abcd-'],
      ['has a dot-separated segment shorter than 3', 'abc.de']
    ];

    for (const [reason, name] of invalidNames) {
      it(`rejects "${name}" (${reason})`, () => {
        expect(validateAccountNameFormat(name)).to.equal(false);
      });
    }

    const nonStringInputs: unknown[] = [undefined, null, 123, {}];

    for (const input of nonStringInputs) {
      it(`rejects non-string input ${String(input)}`, () => {
        expect(validateAccountNameFormat(input as string)).to.equal(false);
      });
    }
  });
});

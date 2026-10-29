import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSessionTime } from './session-time.ts';

describe('resolveSessionTime', () => {
  it('uses a configured 64800 in the wallet', () => {
    assert.equal(resolveSessionTime('64800', 'wallet'), 64800);
  });

  it('uses a configured 900 in the blog', () => {
    assert.equal(resolveSessionTime('900', 'blog'), 900);
  });

  it('defaults to 900 in the wallet when unset', () => {
    assert.equal(resolveSessionTime(undefined, 'wallet'), 900);
  });

  it('defaults to 64800 in the blog when unset', () => {
    assert.equal(resolveSessionTime(undefined, 'blog'), 64800);
  });

  it('accepts exactly 30 days', () => {
    assert.equal(resolveSessionTime('2592000', 'wallet'), 2592000);
  });

  for (const value of ['abc', '', '  ', '0', '-5', 'Infinity', '2592001', '1e20']) {
    it(`falls back to the default for ${JSON.stringify(value)}`, () => {
      assert.equal(resolveSessionTime(value, 'blog'), 64800);
      assert.equal(resolveSessionTime(value, 'wallet'), 900);
    });
  }
});

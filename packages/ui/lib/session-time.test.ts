import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSessionTime } from './session-time.ts';

describe('resolveSessionTime', () => {
  const blog = 'https://hive.blog/';
  const wallet = 'https://wallet.hive.blog/';

  it('uses a configured 64800 even on a wallet domain', () => {
    assert.equal(resolveSessionTime('64800', wallet), 64800);
  });

  it('uses a configured 900 even on a blog domain', () => {
    assert.equal(resolveSessionTime('900', blog), 900);
  });

  it('defaults to 900 on a wallet domain when unset', () => {
    assert.equal(resolveSessionTime(undefined, wallet), 900);
  });

  it('defaults to 64800 on a blog domain when unset', () => {
    assert.equal(resolveSessionTime(undefined, blog), 64800);
  });

  for (const value of ['abc', '', '  ', '0', '-5', 'Infinity']) {
    it(`falls back to the default for ${JSON.stringify(value)}`, () => {
      assert.equal(resolveSessionTime(value, blog), 64800);
      assert.equal(resolveSessionTime(value, wallet), 900);
    });
  }
});

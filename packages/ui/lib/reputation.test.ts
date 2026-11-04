import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { accountReputation, rawAccountReputation } from './reputation.ts';

describe('accountReputation', () => {
  it('returns 25 for zero / new accounts', () => {
    assert.equal(accountReputation(0), 25);
    assert.equal(accountReputation('0'), 25);
  });

  it('floors calibrated bridge floats below and above 100 (denser#920)', () => {
    assert.equal(accountReputation(61.21), 61);
    assert.equal(accountReputation(76.01), 76);
    assert.equal(accountReputation(100.99), 100);
    assert.equal(accountReputation(101.37), 101);
    assert.equal(accountReputation(110), 110);
  });

  it('does not run the raw log10 formula on calibrated values', () => {
    assert.notEqual(accountReputation(100.99), 25);
    assert.equal(accountReputation(-8.4), -9);
  });
});

describe('rawAccountReputation', () => {
  it('returns 25 for zero', () => {
    assert.equal(rawAccountReputation(0), 25);
    assert.equal(rawAccountReputation('0'), 25);
  });

  it('converts raw share_type integers via log10 formula', () => {
    // ~1.06e13 → displayed ~61
    assert.equal(rawAccountReputation(10555944586418), 61);
    // classic example from docs
    assert.equal(rawAccountReputation('95832978796820'), 69);
  });

  it('does not treat raw values below 1e9 as already calibrated (denser#920)', () => {
    // These display as 25 today. The old abs < 1e9 check echoed the raw integer.
    assert.equal(rawAccountReputation(36150048), 25);
    assert.equal(rawAccountReputation(420566781), 25);
    assert.equal(rawAccountReputation(6816344), 25);
    assert.equal(rawAccountReputation(-36150048), 25);
    assert.equal(rawAccountReputation(-6816344), 25);
  });

  it('converts large negative raw values to a negative display score', () => {
    assert.ok(rawAccountReputation(-1e15) < 0);
    assert.equal(rawAccountReputation(-1e15), -29);
  });
});

import { describe, it } from 'mocha';
import { expect } from 'chai';
import { accountReputation, rawAccountReputation } from './reputation';

describe('accountReputation', () => {
  it('returns 25 for zero / new accounts', () => {
    expect(accountReputation(0)).to.equal(25);
    expect(accountReputation('0')).to.equal(25);
  });

  it('floors calibrated bridge floats below and above 100 (denser#920)', () => {
    expect(accountReputation(61.21)).to.equal(61);
    expect(accountReputation(76.01)).to.equal(76);
    expect(accountReputation(100.99)).to.equal(100);
    expect(accountReputation(101.37)).to.equal(101);
    expect(accountReputation(110)).to.equal(110);
  });

  it('does not run the raw log10 formula on calibrated values', () => {
    expect(accountReputation(100.99)).to.not.equal(25);
    expect(accountReputation(-8.4)).to.equal(-9);
  });
});

describe('rawAccountReputation', () => {
  it('returns 25 for zero', () => {
    expect(rawAccountReputation(0)).to.equal(25);
    expect(rawAccountReputation('0')).to.equal(25);
  });

  it('converts raw share_type integers via log10 formula', () => {
    // ~1.06e13 → displayed ~61
    expect(rawAccountReputation(10555944586418)).to.equal(61);
    // classic example from docs
    expect(rawAccountReputation('95832978796820')).to.equal(69);
  });

  it('does not treat raw values below 1e9 as already calibrated (denser#920)', () => {
    // These display as 25 today. The old abs < 1e9 check echoed the raw integer.
    expect(rawAccountReputation(36150048)).to.equal(25);
    expect(rawAccountReputation(420566781)).to.equal(25);
    expect(rawAccountReputation(6816344)).to.equal(25);
    expect(rawAccountReputation(-36150048)).to.equal(25);
    expect(rawAccountReputation(-6816344)).to.equal(25);
  });

  it('converts large negative raw values to a negative display score', () => {
    expect(rawAccountReputation(-1e15)).to.be.below(0);
    expect(rawAccountReputation(-1e15)).to.equal(-29);
  });
});

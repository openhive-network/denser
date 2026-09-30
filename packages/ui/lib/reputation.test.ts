import { describe, it } from 'mocha';
import { expect } from 'chai';
import { accountReputation } from './reputation';

describe('accountReputation', () => {
  it('returns 25 for zero / new accounts', () => {
    expect(accountReputation(0)).to.equal(25);
    expect(accountReputation('0')).to.equal(25);
  });

  it('passes through calibrated bridge floats below and above 100 (denser#920)', () => {
    expect(accountReputation(61.21)).to.equal(61);
    expect(accountReputation(76.01)).to.equal(76);
    expect(accountReputation(100.99)).to.equal(100);
    expect(accountReputation(101.37)).to.equal(101);
  });

  it('converts raw share_type integers via log10 formula', () => {
    // ~1.06e13 → displayed ~61
    expect(accountReputation(10555944586418)).to.equal(61);
    // classic example from docs
    expect(accountReputation('95832978796820')).to.be.within(70, 75);
  });

  it('does not collapse calibrated ≥100 values to the default 25', () => {
    expect(accountReputation(100.99)).to.not.equal(25);
    expect(accountReputation(110)).to.equal(110);
  });
});

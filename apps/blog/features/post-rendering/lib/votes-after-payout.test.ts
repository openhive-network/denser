import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { countVotesAfterPayout } = await import('./votes-after-payout.ts');

describe('countVotesAfterPayout', () => {
  it('is 0 when every vote on chain is counted', () => {
    assert.equal(countVotesAfterPayout(3, 3), 0);
  });

  it('counts one vote cast after payout', () => {
    assert.equal(countVotesAfterPayout(4, 3), 1);
  });

  it('counts several votes cast after payout', () => {
    assert.equal(countVotesAfterPayout(7, 4), 3);
  });

  it('clamps at 0 when the total exceeds the votes on chain', () => {
    assert.equal(countVotesAfterPayout(5, 589), 0);
  });

  it('is 0 when the total is unknown', () => {
    assert.equal(countVotesAfterPayout(4, undefined), 0);
  });
});

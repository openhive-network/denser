import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { countVotesAfterPayout } = await import('./votes-after-payout.ts');

const votes = (...voters: string[]) => voters.map((voter) => ({ voter }));

describe('countVotesAfterPayout', () => {
  it('is 0 when the chain has as many votes as total_votes', () => {
    assert.equal(countVotesAfterPayout(votes('alice', 'bob', 'carol'), 3), 0);
  });

  it('counts one vote cast after payout', () => {
    assert.equal(countVotesAfterPayout(votes('guest4test2', 'hive-103505', 'we-are-ai', 'maxpayn'), 3), 1);
  });

  it('counts several votes cast after payout', () => {
    assert.equal(countVotesAfterPayout(votes('alice', 'bob', 'carol', 'dave', 'erin'), 2), 3);
  });

  it('is 0 when total_votes exceeds the chain votes', () => {
    assert.equal(countVotesAfterPayout(votes('alice'), 589), 0);
  });

  it('counts a voter repeated across list_votes pages once', () => {
    assert.equal(countVotesAfterPayout(votes('alice', 'bob', 'bob', 'carol'), 3), 0);
  });
});

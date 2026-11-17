import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { countVotesAfterPayout } = await import('./votes-after-payout.ts');

const PAYOUT_AT = '2026-03-23T09:28:39';
const BEFORE = '2026-03-16T09:41:15';
const AFTER = '2026-06-09T10:54:54';

const cast = (voter: string, time: string, rshares = 0) => ({ voter, time, rshares, percent: 10000 });
const removed = (voter: string, time: string) => ({ voter, time, rshares: 0, percent: 0 });

describe('countVotesAfterPayout', () => {
  it('is 0 when every vote was cast before the payout', () => {
    assert.equal(countVotesAfterPayout([cast('alice', BEFORE, 9), cast('bob', BEFORE, 5)], PAYOUT_AT), 0);
  });

  it('counts the votes cast after the payout, listed with 0 rshares', () => {
    const votes = [cast('guest4test2', AFTER), cast('hive-103505', BEFORE, 9), cast('maxpayn', AFTER)];
    assert.equal(countVotesAfterPayout(votes, PAYOUT_AT), 2);
  });

  it('is 0 for a paid-out entry whose list holds only removed votes', () => {
    assert.equal(countVotesAfterPayout([removed('guest4test', BEFORE), removed('guest4test2', AFTER)], PAYOUT_AT), 0);
  });

  it('counts only the late votes among removed votes', () => {
    const votes = [removed('unvoter', BEFORE), removed('late-unvoter', AFTER), cast('late', AFTER), cast('alice', BEFORE, 9)];
    assert.equal(countVotesAfterPayout(votes, PAYOUT_AT), 1);
  });

  it('does not count a vote cast before the payout and changed after it', () => {
    assert.equal(countVotesAfterPayout([cast('venus2203', AFTER, 488_069_097_000), cast('late', AFTER)], PAYOUT_AT), 1);
  });

  it('is 0 for a pending entry, whose payout is still ahead', () => {
    const votes = [cast('alice', BEFORE, 9), removed('unvoter', BEFORE)];
    assert.equal(countVotesAfterPayout(votes, '2026-12-01T00:00:00'), 0);
  });

  it('is 0 when the payout time is unknown', () => {
    assert.equal(countVotesAfterPayout([cast('alice', AFTER)], ''), 0);
  });

  it('counts a voter repeated across list_votes pages once', () => {
    assert.equal(countVotesAfterPayout([cast('bob', AFTER), cast('bob', AFTER)], PAYOUT_AT), 1);
  });
});

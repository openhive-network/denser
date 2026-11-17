import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { countCountedVotes, keepCountedVotes } = await import('./counted-votes.ts');

const PAYOUT_AT = '2026-03-23T09:28:39';
const BEFORE = '2026-03-16T09:41:15';
const AFTER = '2026-06-09T10:54:54';

const cast = (voter: string, time: string, rshares: number) => ({ voter, time, rshares, percent: 10000 });
const removed = (voter: string, time: string) => ({ voter, time, rshares: 0, percent: 0 });
const voters = (votes: { voter: string }[]) => votes.map((vote) => vote.voter);

describe('keepCountedVotes', () => {
  it('keeps nothing of a paid-out entry whose list holds only removed votes', () => {
    assert.deepEqual(keepCountedVotes([removed('guest4test', BEFORE), removed('guest4test2', AFTER)], PAYOUT_AT), []);
  });

  it('drops removed votes and votes cast after the payout, keeping downvotes', () => {
    const votes = [
      cast('upvoter', BEFORE, 5_000_000),
      removed('unvoter', BEFORE),
      cast('downvoter', BEFORE, -3_000_000),
      cast('late', AFTER, 0),
      removed('late-unvoter', AFTER)
    ];
    assert.deepEqual(voters(keepCountedVotes(votes, PAYOUT_AT)), ['upvoter', 'downvoter']);
  });

  it('keeps the cast votes of a pending entry and drops its removed ones', () => {
    const votes = [cast('alice', AFTER, 900), removed('bob', BEFORE), cast('carol', BEFORE, 0)];
    assert.deepEqual(voters(keepCountedVotes(votes, '2026-12-01T00:00:00')), ['alice', 'carol']);
  });
});

describe('countCountedVotes', () => {
  it('is 0 for a paid-out entry whose list holds only removed votes', () => {
    assert.equal(countCountedVotes([removed('guest4test1', AFTER), removed('guest4test2', BEFORE)], PAYOUT_AT), 0);
  });

  it('counts a vote changed after the payout that kept its rshares, and each voter once', () => {
    const votes = [cast('venus2203', AFTER, 488_069_097_000), cast('alice', BEFORE, 9), cast('alice', BEFORE, 9), cast('late', AFTER, 0)];
    assert.equal(countCountedVotes(votes, PAYOUT_AT), 2);
  });

  it('counts every cast vote of a pending entry', () => {
    assert.equal(countCountedVotes([cast('alice', BEFORE, 9), cast('bob', AFTER, 0), removed('carol', BEFORE)], '2026-12-01T00:00:00'), 2);
  });
});

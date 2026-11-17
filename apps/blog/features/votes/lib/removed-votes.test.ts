import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { castVoteCount, isRemovedVote, keepCastVotes } = await import('./removed-votes.ts');

const stats = (totalVotes: number) => ({ total_votes: totalVotes, flag_weight: 0, gray: false, hide: false });

describe('isRemovedVote', () => {
  it('judges a vote by its percent where it has one', () => {
    assert.equal(isRemovedVote({ rshares: 0, percent: 0 }), true);
    assert.equal(isRemovedVote({ rshares: 0, percent: 100 }), false);
    assert.equal(isRemovedVote({ rshares: 5_000_000, percent: 10000 }), false);
    assert.equal(isRemovedVote({ rshares: -5_000_000, percent: -10000 }), false);
  });

  it('judges a vote by its rshares where it has no percent', () => {
    assert.equal(isRemovedVote({ rshares: 0 }), true);
    assert.equal(isRemovedVote({ rshares: 5_000_000 }), false);
    assert.equal(isRemovedVote({ rshares: -5_000_000 }), false);
  });
});

describe('keepCastVotes', () => {
  it('drops unvotes and keeps upvotes, downvotes and dust votes with a percent', () => {
    const votes = [
      { voter: 'upvoter', rshares: 5_000_000, percent: 10000 },
      { voter: 'unvoter', rshares: 0, percent: 0 },
      { voter: 'downvoter', rshares: -3_000_000, percent: -5000 },
      { voter: 'duster', rshares: 0, percent: 100 }
    ];
    assert.deepEqual(
      keepCastVotes(votes).map((vote) => vote.voter),
      ['upvoter', 'downvoter', 'duster']
    );
  });

  it('drops zero-rshares votes listed without a percent', () => {
    const votes = [
      { voter: 'upvoter', rshares: 5_000_000 },
      { voter: 'zero', rshares: 0 },
      { voter: 'downvoter', rshares: -3_000_000 }
    ];
    assert.deepEqual(
      keepCastVotes(votes).map((vote) => vote.voter),
      ['upvoter', 'downvoter']
    );
  });
});

describe('castVoteCount', () => {
  it('takes the removed votes of a full vote list off the total, downvotes counted', () => {
    const entry = {
      stats: stats(3),
      active_votes: [
        { voter: 'upvoter', rshares: 5_000_000 },
        { voter: 'unvoter', rshares: 0 },
        { voter: 'downvoter', rshares: -3_000_000 }
      ]
    };
    assert.equal(castVoteCount(entry), 2);
  });

  it('gives the total of an entry without removed votes', () => {
    const activeVotes = [
      { voter: 'a', rshares: 1 },
      { voter: 'b', rshares: -1 }
    ];
    assert.equal(castVoteCount({ stats: stats(2), active_votes: activeVotes }), 2);
    assert.equal(castVoteCount({ stats: stats(7), observer_vote: { rshares: 900, percent: 10000 } }), 7);
    assert.equal(castVoteCount({ stats: stats(7), observer_vote: null }), 7);
  });

  it("takes only the observer's removed vote off the total of a vote-free entry", () => {
    assert.equal(castVoteCount({ stats: stats(2), observer_vote: { rshares: 0, percent: 0 } }), 1);
  });

  it("takes the observer's vote removed before payout off the total of a pending vote-free entry", () => {
    const entry = { stats: stats(589), is_paidout: false, observer_vote: { rshares: 0, percent: 0 } };
    assert.equal(castVoteCount(entry), 588);
  });

  it("keeps the total of a paid-out vote-free entry whose observer removed a vote cast after payout", () => {
    const entry = { stats: stats(589), is_paidout: true, observer_vote: { rshares: 0, percent: 0 } };
    assert.equal(castVoteCount(entry), 589);
    assert.equal(castVoteCount({ ...entry, observer_vote: null }), 589);
  });

  it('keeps the counted votes of a paid-out entry that lists a vote cast after payout', () => {
    const entry = {
      stats: stats(1),
      active_votes: [
        { voter: 'gtg', rshares: 223_504_766_152 },
        { voter: 'ordosjc', rshares: 0 }
      ]
    };
    assert.equal(castVoteCount(entry), 1);
  });

  it('takes off the removed votes beyond the votes cast after payout', () => {
    const entry = {
      stats: stats(3),
      active_votes: [
        { voter: 'upvoter', rshares: 5_000_000 },
        { voter: 'downvoter', rshares: -3_000_000 },
        { voter: 'unvoter', rshares: 0 },
        { voter: 'late', rshares: 0 }
      ]
    };
    assert.equal(castVoteCount(entry), 2);
  });

  it('gives 0 without stats and never below 0', () => {
    assert.equal(castVoteCount({}), 0);
    assert.equal(castVoteCount({ stats: stats(1), active_votes: [{ voter: 'a', rshares: 0 }] }), 0);
  });
});

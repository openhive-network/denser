import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { viewerVoteOf } = await import('./viewer-vote.ts');

type VotedEntry = Parameters<typeof viewerVoteOf>[0];

const post = (fields: Partial<VotedEntry>): VotedEntry => ({ author: 'alice', permlink: 'hello', ...fields });

describe('viewerVoteOf', () => {
  it("takes the viewer's vote from observer_vote when the entry was read as the viewer", () => {
    const vote = viewerVoteOf(post({ observer_vote: { rshares: 900, percent: -2500 }, _observer: 'bob' }), 'bob');

    assert.ok(vote.known);
    assert.equal(vote.votes.votes.length, 1);
    assert.deepEqual(
      { voter: vote.votes.votes[0].voter, rshares: vote.votes.votes[0].rshares, percent: vote.votes.votes[0].vote_percent },
      { voter: 'bob', rshares: 900, percent: -2500 }
    );
    assert.equal(vote.votes.votes[0].author, 'alice');
    assert.equal(vote.votes.votes[0].permlink, 'hello');
  });

  it('knows the viewer has not voted when observer_vote is null, so nothing is looked up', () => {
    assert.deepEqual(viewerVoteOf(post({ observer_vote: null, _observer: 'bob' }), 'bob'), {
      known: true,
      votes: { votes: [] }
    });
  });

  it("looks the vote up when the vote-free entry was read as another observer, whose vote it carries", () => {
    const readAsDefault = post({ observer_vote: { rshares: 5, percent: 10000 }, _observer: 'hive.blog' });

    assert.deepEqual(viewerVoteOf(readAsDefault, 'bob'), { known: false, lookUp: true });
  });

  it('looks the vote up when active_votes list the viewer, and not otherwise', () => {
    const voted = post({ active_votes: [{ voter: 'carol', rshares: 1 }, { voter: 'bob', rshares: 2 }] });
    const notVoted = post({ active_votes: [{ voter: 'carol', rshares: 1 }] });

    assert.deepEqual(viewerVoteOf(voted, 'bob'), { known: false, lookUp: true });
    assert.deepEqual(viewerVoteOf(notVoted, 'bob'), { known: false, lookUp: false });
  });

  it('looks nothing up for a signed-out viewer', () => {
    assert.deepEqual(viewerVoteOf(post({ observer_vote: null, _observer: '' }), ''), { known: false, lookUp: false });
    assert.deepEqual(viewerVoteOf(post({ observer_vote: null, _observer: 'hive.blog' }), ''), {
      known: false,
      lookUp: false
    });
  });
});

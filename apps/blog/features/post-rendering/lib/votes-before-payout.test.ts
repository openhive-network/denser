import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { keepVotesBeforePayout } = await import('./votes-before-payout.ts');

const vote = (voter: string, time: string) => ({ voter, time });

describe('keepVotesBeforePayout', () => {
  it('drops votes cast after the payout and keeps zero-weight votes cast before it', () => {
    const votes = [
      vote('guest4test2', '2026-06-09T10:54:54'),
      vote('hive-103505', '2026-03-16T09:41:15'),
      vote('we-are-ai', '2026-03-16T09:40:48'),
      vote('maxpayn', '2026-03-16T09:44:57')
    ];
    assert.deepEqual(
      keepVotesBeforePayout(votes, '2026-03-23T09:28:39').map((v) => v.voter),
      ['hive-103505', 'we-are-ai', 'maxpayn']
    );
  });

  it('keeps a vote cast at the payout second', () => {
    const votes = [vote('alice', '2026-03-23T09:28:39'), vote('bob', '2026-03-23T09:28:40')];
    assert.deepEqual(
      keepVotesBeforePayout(votes, '2026-03-23T09:28:39').map((v) => v.voter),
      ['alice']
    );
  });

  it('keeps every vote when the payout time is unknown', () => {
    const votes = [vote('alice', '2026-03-23T09:28:39')];
    assert.equal(keepVotesBeforePayout(votes, ''), votes);
  });
});

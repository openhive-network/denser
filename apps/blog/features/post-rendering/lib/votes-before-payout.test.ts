import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { keepVotesAfterPayout, keepVotesBeforePayout } = await import('./votes-before-payout.ts');

const vote = (voter: string, time: string, rshares = 0) => ({ voter, time, rshares });

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

  it('keeps a vote cast before the payout and changed after it, which kept its rshares', () => {
    const votes = [vote('venus2203', '2021-11-08T03:13:03', 488_069_097_000), vote('brazilec', '2021-07-07T09:08:30')];
    assert.deepEqual(
      keepVotesBeforePayout(votes, '2021-06-25T19:31:45').map((v) => v.voter),
      ['venus2203']
    );
  });
});

describe('keepVotesAfterPayout', () => {
  it('keeps the votes listed after the payout with no rshares', () => {
    const votes = [
      vote('venus2203', '2021-11-08T03:13:03', 488_069_097_000),
      vote('brazilec', '2021-07-07T09:08:30'),
      vote('smooth', '2021-06-20T21:29:36', 116_811_864_870_173)
    ];
    assert.deepEqual(
      keepVotesAfterPayout(votes, '2021-06-25T19:31:45').map((v) => v.voter),
      ['brazilec']
    );
  });

  it('keeps no vote when the payout time is unknown', () => {
    assert.deepEqual(keepVotesAfterPayout([vote('alice', '2026-03-23T09:28:39')], ''), []);
  });
});

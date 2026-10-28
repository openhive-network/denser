import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const { matchPostingKey } = await import('./posting-key-match.ts');

const DERIVED = 'STM7SzVBFaUpKFCgTruZig4UVdRGzurFLvnudxkQbhX1eFtoTEoDc';
const OTHER = 'STM8m5UgaFAAYQRuaNejYdS8FVLVp9Ghm2D6b2gUMUddLUMBDx7ZZ';

describe('matchPostingKey', () => {
  it('finds the derived key among the posting key members', () => {
    const authority = { weight_threshold: 1, key_auths: [[OTHER, 1], [DERIVED, 1]] as [string, number][] };
    assert.equal(matchPostingKey(authority, [DERIVED]), DERIVED);
  });

  it('is null when the posting authority does not list any derived key', () => {
    const authority = { weight_threshold: 1, key_auths: [[OTHER, 1]] as [string, number][] };
    assert.equal(matchPostingKey(authority, [DERIVED]), null);
    assert.equal(matchPostingKey(authority, []), null);
  });

  it('is null when the derived key alone does not meet the threshold', () => {
    const authority = { weight_threshold: 2, key_auths: [[DERIVED, 1], [OTHER, 1]] as [string, number][] };
    assert.equal(matchPostingKey(authority, [DERIVED]), null);
  });

  it('takes the first derived key that signs alone', () => {
    const authority = { weight_threshold: 2, key_auths: [[DERIVED, 1], [OTHER, 2]] as [string, number][] };
    assert.equal(matchPostingKey(authority, [DERIVED, OTHER]), OTHER);
  });
});

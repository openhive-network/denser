import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isPostListed, isProfileListed } from './listed-content.ts';

describe('isProfileListed', () => {
  it('hides a GDPR-listed account', () => {
    assert.equal(isProfileListed('xondra'), true);
  });

  it('hides a legally blocked account', () => {
    assert.equal(isProfileListed('aplomb'), true);
  });

  it('shows an unlisted account', () => {
    assert.equal(isProfileListed('acidyo'), false);
  });
});

describe('isPostListed', () => {
  it('hides a post at a DMCA-listed path', () => {
    assert.equal(isPostListed('motivation', 'carlidos', 'the-power-that-moves-the-world'), true);
  });

  it('shows the same author elsewhere when only the path is listed', () => {
    assert.equal(isPostListed('motivation', 'carlidos', 'another-post'), false);
  });

  it('hides any post of a DMCA-listed author', () => {
    assert.equal(isPostListed('hive-1', 'the-gaming-llama', 'any'), true);
  });

  it('hides any post of a GDPR-listed or legally blocked author', () => {
    assert.equal(isPostListed('hive-1', 'xondra', 'any'), true);
    assert.equal(isPostListed('hive-1', 'aplomb', 'any'), true);
  });

  it('shows an unlisted post', () => {
    assert.equal(isPostListed('back', 'acidyo', 'back-at-the-station'), false);
  });
});

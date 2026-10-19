import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { unlockHint } from './unlock-hint.ts';

describe('unlockHint', () => {
  it('names the key an active-key operation requires, and the posting login key that unlocks it', () => {
    assert.equal(unlockHint('posting', 'active'), 'the operation requires key active; unlock login key posting first');
  });

  it('names the login key alone when the operation requires that key', () => {
    assert.equal(unlockHint('active', 'active'), 'unlock key active');
  });

  it('names the login key alone when the operation requires no particular key', () => {
    assert.equal(unlockHint('posting'), 'unlock key posting');
  });
});

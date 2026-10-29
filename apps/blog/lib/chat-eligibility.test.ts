import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isEligibleForChat } from './chat-eligibility.ts';

const STRICT_ALICE = { isLoggedIn: true, strict: true, username: 'alice' };
const EVERYONE = { allowNonStrictLogin: false, allowedUsers: [] };

describe('isEligibleForChat', () => {
  it('offers chat to a user signed in strictly', () => {
    assert.equal(isEligibleForChat(STRICT_ALICE, EVERYONE), true);
  });

  it('refuses a signed-out user', () => {
    assert.equal(isEligibleForChat({ ...STRICT_ALICE, isLoggedIn: false }, EVERYONE), false);
  });

  it('refuses a non-strict sign-in unless it is allowed', () => {
    const nonStrict = { ...STRICT_ALICE, strict: false };
    assert.equal(isEligibleForChat(nonStrict, EVERYONE), false);
    assert.equal(isEligibleForChat(nonStrict, { ...EVERYONE, allowNonStrictLogin: true }), true);
  });

  it('offers chat only to the allowed users when there is a list', () => {
    const onlyBob = { ...EVERYONE, allowedUsers: ['bob'] };
    assert.equal(isEligibleForChat(STRICT_ALICE, onlyBob), false);
    assert.equal(isEligibleForChat({ ...STRICT_ALICE, username: 'bob' }, onlyBob), true);
  });
});

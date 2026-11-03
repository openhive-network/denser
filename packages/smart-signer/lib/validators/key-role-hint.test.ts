import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findKeyRefusalHint, findRegistrationKeyRoleHint, KEY_ROLE_HINTS } from './key-role-hint.ts';

const POSTING_HINT = 'login_form.zod_error.active_key_for_posting';
const ACTIVE_HINT = 'login_form.zod_error.key_without_active_authority';

class AuthorizationError extends Error {}

describe('findRegistrationKeyRoleHint', () => {
  it("maps hived's Missing Posting Authority to the posting-key hint", () => {
    const error = new Error('missing required posting authority:Missing Posting Authority guest4test2');
    assert.equal(findRegistrationKeyRoleHint(error, 'posting'), POSTING_HINT);
  });

  it("maps hived's Missing Active Authority to the active-key hint", () => {
    const error = new Error('missing required active authority:Missing Active Authority guest4test2');
    assert.equal(findRegistrationKeyRoleHint(error, 'active'), ACTIVE_HINT);
  });

  it('names the role the chain found missing, whichever key type was asked for', () => {
    assert.equal(findRegistrationKeyRoleHint('Missing Active Authority gtg', 'posting'), ACTIVE_HINT);
  });

  it("maps hb-auth's Invalid credentials to the hint of the key type registered", () => {
    const error = new AuthorizationError('Invalid credentials');
    assert.equal(findRegistrationKeyRoleHint(error, 'posting'), POSTING_HINT);
    assert.equal(findRegistrationKeyRoleHint(error, 'active'), ACTIVE_HINT);
  });

  it('reads the message of a plain object, as a worker error arrives', () => {
    assert.equal(findRegistrationKeyRoleHint({ message: 'Invalid credentials' }, 'posting'), POSTING_HINT);
  });

  it('leaves other failures to their own messages', () => {
    for (const message of [
      'Invalid WIF format',
      'Invalid password',
      'Wallet not found: gtg',
      'Missing field: "trx"'
    ]) {
      assert.equal(findRegistrationKeyRoleHint(new Error(message), 'posting'), null, message);
    }
    assert.equal(findRegistrationKeyRoleHint(undefined, 'posting'), null);
  });

  it('has a hint for each key type a sign-in asks for', () => {
    assert.deepEqual(KEY_ROLE_HINTS, { posting: POSTING_HINT, active: ACTIVE_HINT });
  });
});

describe('findKeyRefusalHint', () => {
  const authorised = { kind: 'authorised-account', owner: 'guest4test1' } as const;
  const unrelated = { kind: 'unrelated-account', owner: 'guest4test3' } as const;

  it("gives the role hint for the account's own key of another role", () => {
    assert.deepEqual(findKeyRefusalHint({ kind: 'own-other-role' }, 'guest4test2', 'active', true), {
      key: ACTIVE_HINT
    });
  });

  it("names an authorised account's key, and its account, in Direct Authority Mode", () => {
    assert.deepEqual(findKeyRefusalHint(authorised, 'guest4test2', 'active', true), {
      key: 'login_form.zod_error.authorised_account_active_key',
      values: { owner: 'guest4test1', account: 'guest4test2' }
    });
    assert.equal(
      findKeyRefusalHint(authorised, 'guest4test2', 'posting', true)?.key,
      'login_form.zod_error.authorised_account_posting_key'
    );
  });

  it("refuses no authorised account's key with Direct Authority Mode off", () => {
    assert.equal(findKeyRefusalHint(authorised, 'guest4test2', 'active', false), null);
  });

  it("names an unrelated account's key, whatever the mode", () => {
    const hint = {
      key: 'login_form.zod_error.other_account_posting_key',
      values: { owner: 'guest4test3', account: 'guest4test2' }
    };
    assert.deepEqual(findKeyRefusalHint(unrelated, 'guest4test2', 'posting', true), hint);
    assert.deepEqual(findKeyRefusalHint(unrelated, 'guest4test2', 'posting', false), hint);
  });
});

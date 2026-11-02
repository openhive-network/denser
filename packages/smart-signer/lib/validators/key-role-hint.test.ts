import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findRegistrationKeyRoleHint, KEY_ROLE_HINTS } from './key-role-hint.ts';

const POSTING_HINT = 'login_form.zod_error.active_key_for_posting';
const ACTIVE_HINT = 'login_form.zod_error.posting_key_for_active';

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
    for (const message of ['Invalid WIF format', 'Invalid password', 'Wallet not found: gtg', 'Missing field: "trx"']) {
      assert.equal(findRegistrationKeyRoleHint(new Error(message), 'posting'), null, message);
    }
    assert.equal(findRegistrationKeyRoleHint(undefined, 'posting'), null);
  });

  it('has a hint for each key type a sign-in asks for', () => {
    assert.deepEqual(KEY_ROLE_HINTS, { posting: POSTING_HINT, active: ACTIVE_HINT });
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  findWrongSafeStoragePassword,
  isHbAuthInvalidCredentials,
  WrongSafeStoragePasswordError
} from './wrong-safe-storage-password.ts';

/** hb-auth's refusal as its worker hands it over: a plain Error carrying the class's name */
function hbAuthError(message: string): Error {
  const error = new Error(message);
  error.name = 'AuthorizationError';
  return error;
}

describe('isHbAuthInvalidCredentials', () => {
  it("recognises hb-auth's AuthorizationError Invalid credentials", () => {
    assert.equal(isHbAuthInvalidCredentials(hbAuthError('Invalid credentials')), true);
  });

  it('recognises it as the cause of a wrapping error', () => {
    const wrapped = new Error('Signing failed', {
      cause: new Error('Unlock', { cause: hbAuthError('Invalid credentials') })
    });
    assert.equal(isHbAuthInvalidCredentials(wrapped), true);
  });

  it("leaves hb-auth's other AuthorizationErrors and a plain Invalid credentials alone", () => {
    assert.equal(isHbAuthInvalidCredentials(hbAuthError('Unexpected error: boom')), false);
    assert.equal(isHbAuthInvalidCredentials(new Error('Invalid credentials')), false);
    assert.equal(isHbAuthInvalidCredentials('Invalid credentials'), false);
    assert.equal(isHbAuthInvalidCredentials(undefined), false);
  });
});

describe('findWrongSafeStoragePassword', () => {
  it('finds the error directly and as a cause', () => {
    const wrongPassword = new WrongSafeStoragePasswordError(hbAuthError('Invalid credentials'));
    assert.equal(findWrongSafeStoragePassword(wrongPassword), wrongPassword);
    assert.equal(
      findWrongSafeStoragePassword(new Error('Transfer failed', { cause: wrongPassword })),
      wrongPassword
    );
  });

  it("keeps hb-auth's message and refusal for the log", () => {
    const refusal = hbAuthError('Invalid credentials');
    const wrongPassword = new WrongSafeStoragePasswordError(refusal);
    assert.equal(wrongPassword.message, 'Invalid credentials');
    assert.equal(wrongPassword.cause, refusal);
  });

  it("does not take hb-auth's refusal at key registration for a wrong password", () => {
    assert.equal(
      findWrongSafeStoragePassword(
        new Error('Invalid credentials', { cause: hbAuthError('Invalid credentials') })
      ),
      undefined
    );
    assert.equal(findWrongSafeStoragePassword(new Error('Unlocking key failed')), undefined);
  });
});

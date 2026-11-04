import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyUnlockRefusal,
  findSafeStorageKeyNotAuthorized,
  findWrongSafeStoragePassword,
  SafeStorageKeyNotAuthorizedError,
  WrongSafeStoragePasswordError
} from './wrong-safe-storage-password.ts';

/** hb-auth's refusal as its worker hands it over: Comlink's plain Error carrying the class's name */
function hbAuthError(message: string): Error {
  const thrown = { message, name: 'AuthorizationError', stack: 'AuthorizationError: in the worker' };
  return Object.assign(new Error(thrown.message), thrown);
}

/** hb-auth's own error class, which its authority check on the main thread rejects with */
class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

const stored = async () => true;
const notStored = async () => false;

describe('classifyUnlockRefusal', () => {
  it("takes the worker's refusal for a stored account for a wrong password", async () => {
    assert.equal(await classifyUnlockRefusal(hbAuthError('Invalid credentials'), stored), 'wrong-password');
  });

  it("takes the worker's refusal for an account safe storage no longer holds for a missing key", async () => {
    assert.equal(await classifyUnlockRefusal(hbAuthError('Invalid credentials'), notStored), 'key-not-stored');
  });

  it("takes the main thread's refusal for a key the account's authority no longer accepts", async () => {
    let asked = false;
    const refusal = await classifyUnlockRefusal(new AuthorizationError('Invalid credentials'), async () => {
      asked = true;
      return true;
    });
    assert.equal(refusal, 'key-not-authorized');
    assert.equal(asked, false);
  });

  it('classifies the refusal as the cause of a wrapping error', async () => {
    const wrap = (cause: Error) => new Error('Signing failed', { cause: new Error('Unlock', { cause }) });
    assert.equal(await classifyUnlockRefusal(wrap(hbAuthError('Invalid credentials')), stored), 'wrong-password');
    assert.equal(
      await classifyUnlockRefusal(wrap(new AuthorizationError('Invalid credentials')), stored),
      'key-not-authorized'
    );
  });

  it("leaves hb-auth's other AuthorizationErrors and a plain Invalid credentials alone", async () => {
    assert.equal(await classifyUnlockRefusal(hbAuthError('Unexpected error: boom'), stored), undefined);
    assert.equal(
      await classifyUnlockRefusal(new AuthorizationError('Not authorized, missing authority'), stored),
      undefined
    );
    assert.equal(await classifyUnlockRefusal(new Error('Invalid credentials'), stored), undefined);
    assert.equal(await classifyUnlockRefusal('Invalid credentials', stored), undefined);
    assert.equal(await classifyUnlockRefusal(undefined, stored), undefined);
  });
});

describe('findSafeStorageKeyNotAuthorized', () => {
  it('finds the error with its key type directly and as a cause', () => {
    const notAuthorized = new SafeStorageKeyNotAuthorizedError('active', new AuthorizationError('Invalid credentials'));
    assert.equal(findSafeStorageKeyNotAuthorized(notAuthorized), notAuthorized);
    assert.equal(findSafeStorageKeyNotAuthorized(new Error('Transfer failed', { cause: notAuthorized }))?.keyType, 'active');
  });

  it('is told apart from a wrong password', () => {
    const notAuthorized = new SafeStorageKeyNotAuthorizedError('posting', new AuthorizationError('Invalid credentials'));
    assert.equal(findWrongSafeStoragePassword(notAuthorized), undefined);
    assert.equal(
      findSafeStorageKeyNotAuthorized(new WrongSafeStoragePasswordError(hbAuthError('Invalid credentials'))),
      undefined
    );
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

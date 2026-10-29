import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isUserCancelled } from './user-cancelled.ts';

describe('isUserCancelled', () => {
  for (const message of [
    'No password from user',
    'User rejected the request.',
    'MetaMask Tx Signature: User denied transaction signature.',
    'Request was rejected by the user',
    'Operation was user cancelled'
  ]) {
    it(`takes "${message}" for the user's own cancel`, () => {
      assert.equal(isUserCancelled(new Error(message)), true);
    });
  }

  for (const message of [
    'Transaction rejected: missing required posting authority',
    'RPC error: request rejected by node api.hive.blog',
    'rejected'
  ]) {
    it(`leaves "${message}" to be shown and reported`, () => {
      assert.equal(isUserCancelled(new Error(message)), false);
    });
  }

  it('reads a thrown string as its message', () => {
    assert.equal(isUserCancelled('user rejected'), true);
    assert.equal(isUserCancelled('Broadcast rejected'), false);
  });
});

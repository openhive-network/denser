import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hasEncryptedMemoMarker, memoToBroadcast } from './encrypted-memo.ts';

const ENCRYPTED = { plaintext: '#hello', toAccount: 'alice', ciphertext: '#8j3XSecWPyvLkxjZ' };

describe('memoToBroadcast', () => {
  it('broadcasts a memo without the `#` marker as typed', () => {
    assert.equal(memoToBroadcast('thanks for the coffee', 'alice', null), 'thanks for the coffee');
    assert.equal(memoToBroadcast('', 'alice', null), '');
  });

  it('broadcasts the ciphertext made for the same plaintext and recipient', () => {
    assert.equal(memoToBroadcast('#hello', 'alice', ENCRYPTED), ENCRYPTED.ciphertext);
  });

  it('has nothing to broadcast for a `#` memo not yet encrypted', () => {
    assert.equal(memoToBroadcast('#hello', 'alice', null), null);
  });

  it('has nothing to broadcast once the memo was edited after encrypting', () => {
    assert.equal(memoToBroadcast('#hello again', 'alice', ENCRYPTED), null);
  });

  it('has nothing to broadcast once the recipient changed: the ciphertext is for the old memo key', () => {
    assert.equal(memoToBroadcast('#hello', 'bob', ENCRYPTED), null);
  });
});

describe('hasEncryptedMemoMarker', () => {
  it('is true only for a leading `#`', () => {
    assert.equal(hasEncryptedMemoMarker('#hello'), true);
    assert.equal(hasEncryptedMemoMarker('hello #1'), false);
    assert.equal(hasEncryptedMemoMarker(''), false);
  });
});

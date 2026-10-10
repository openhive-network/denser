import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { encryptMemoWithKeychain, decryptMemoWithKeychain } from './keychain-memo-crypto.ts';

/**
 * Regression for gitlab.syncad.com/hive/denser#605 / #713: `KeychainProvider`
 * sent lowercase `'memo'`, but the extension's `encodeMessage` handler
 * exact-matches capitalized `'Memo'` (`KeychainKeyTypes`) - a silent mismatch
 * that fell back to the recipient's POSTING key, producing undecryptable
 * ciphertext. `encryptMemoWithKeychain` bypasses the provider with the correct
 * casing; decode was never affected (case-insensitive there), so
 * `decryptMemoWithKeychain` just uses the standard provider.
 */

type KeychainCallback = (response: { success: boolean; result?: string; error?: string }) => void;

const stubKeychain = (keychain: Record<string, unknown>) => {
  Object.defineProperty(globalThis, 'window', { value: { hive_keychain: keychain }, configurable: true });
};

describe('keychain-memo-crypto: memo key-type casing (regression for #605 / #713)', () => {
  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'window');
  });

  it('encryptMemoWithKeychain requests the capitalized "Memo" key type', async () => {
    let captured: unknown[] = [];
    stubKeychain({
      requestEncodeMessage: (username: string, receiver: string, message: string, method: string, callback: KeychainCallback) => {
        captured = [username, receiver, message, method];
        callback({ success: true, result: '#encrypted' });
      }
    });

    const result = await encryptMemoWithKeychain('teamvn', 'quochuy', '#secret');
    assert.deepEqual(captured, ['teamvn', 'quochuy', '#secret', 'Memo']);
    assert.equal(result, '#encrypted');
  });

  it('decryptMemoWithKeychain (via KeychainProvider) requests the lowercase "memo" role', async () => {
    let capturedMethod: string | undefined;
    stubKeychain({
      requestVerifyKey: (_account: string, _message: string, method: string, callback: KeychainCallback) => {
        capturedMethod = method;
        callback({ success: true, result: '#secret' });
      }
    });

    const result = await decryptMemoWithKeychain('quochuy', '#encrypted');
    assert.equal(capturedMethod, 'memo');
    assert.equal(result, '#secret');
  });

  it('rejects when Keychain reports an error', async () => {
    stubKeychain({
      requestEncodeMessage: (_u: string, _r: string, _m: string, _method: string, callback: KeychainCallback) =>
        callback({ success: false, error: 'user cancelled' })
    });

    await assert.rejects(encryptMemoWithKeychain('teamvn', 'quochuy', '#secret'), /user cancelled/);
  });
});

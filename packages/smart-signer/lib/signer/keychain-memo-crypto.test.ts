import { describe, it, afterEach } from 'mocha';
import { expect } from 'chai';
import { encryptMemoWithKeychain, decryptMemoWithKeychain } from './keychain-memo-crypto';

/**
 * Regression for gitlab.syncad.com/hive/denser#605 / #713: `KeychainProvider`
 * sent lowercase `'memo'`, but the extension's `encodeMessage` handler
 * exact-matches capitalized `'Memo'` (`KeychainKeyTypes`) - a silent mismatch
 * that fell back to the recipient's POSTING key, producing undecryptable
 * ciphertext. `encryptMemoWithKeychain` bypasses the provider with the correct
 * casing; decode was never affected (case-insensitive there), so
 * `decryptMemoWithKeychain` just uses the standard provider.
 *
 * Lives under `signer/` (not signer-agnostic `memo-crypto.ts`), owned by
 * `SignerKeychain` - review finding on !1124. Kept in its own module rather
 * than inlined into `signer-keychain.ts` so it stays testable: that file
 * pulls in a real `@hiveio/wax` value import (ESM-only, breaks under mocha).
 */
describe('keychain-memo-crypto: memo key-type casing (regression for #605 / #713)', () => {
  afterEach(() => {
    delete (global as unknown as { window?: unknown }).window;
  });

  it('encryptMemoWithKeychain requests the capitalized "Memo" key type', async () => {
    let capturedMethod: string | undefined;
    (global as unknown as { window: unknown }).window = {
      hive_keychain: {
        requestEncodeMessage: (
          _username: string,
          _receiver: string,
          _message: string,
          method: string,
          callback: (response: { success: boolean; result?: string }) => void
        ) => {
          capturedMethod = method;
          callback({ success: true, result: '#encrypted' });
        }
      }
    };

    const result = await encryptMemoWithKeychain('teamvn', 'quochuy', '#secret');
    expect(capturedMethod).to.equal('Memo');
    expect(result).to.equal('#encrypted');
  });

  it('decryptMemoWithKeychain (via KeychainProvider) requests the lowercase "memo" role', async () => {
    let capturedMethod: string | undefined;
    (global as unknown as { window: unknown }).window = {
      hive_keychain: {
        requestVerifyKey: (
          _account: string,
          _message: string,
          method: string,
          callback: (response: { success: boolean; result?: string }) => void
        ) => {
          capturedMethod = method;
          callback({ success: true, result: '#secret' });
        }
      }
    };

    const result = await decryptMemoWithKeychain('quochuy', '#encrypted');
    expect(capturedMethod).to.equal('memo');
    expect(result).to.equal('#secret');
  });

  it('rejects when Keychain reports an error', async () => {
    (global as unknown as { window: unknown }).window = {
      hive_keychain: {
        requestEncodeMessage: (
          _username: string,
          _receiver: string,
          _message: string,
          _method: string,
          callback: (response: { success: boolean; error?: string }) => void
        ) => callback({ success: false, error: 'user cancelled' })
      }
    };

    let threw = false;
    try {
      await encryptMemoWithKeychain('teamvn', 'quochuy', '#secret');
    } catch {
      threw = true;
    }
    expect(threw).to.equal(true);
  });
});

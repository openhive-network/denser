import { describe, it, afterEach } from 'mocha';
import { expect } from 'chai';
import { encryptMemoWithKeychain, decryptMemoWithKeychain } from './memo-crypto';

/**
 * Regression coverage for gitlab.syncad.com/hive/denser#605 / #713: a real
 * teamvn -> quochuy transfer encrypted via Keychain produced ciphertext
 * nobody could decrypt, including the production wallet.hive.blog. Root
 * cause was `KeychainProvider` (from `@hiveio/wax-signers-keychain`)
 * forwarding wax's lowercase `TRole` ('memo') verbatim to the Keychain
 * window API, while the real extension's `KeychainKeyTypes` enum
 * (hive-keychain-commons) is capitalized ('Memo') - a silent mismatch that
 * made the extension fall back to the recipient's POSTING key instead of
 * throwing. `memo-crypto.ts` now calls `window.hive_keychain` directly with
 * the correct casing; these tests pin that exact string so it cannot
 * regress silently again.
 *
 * Note: `encryptMemoWithPrivateKey`/`decryptMemoWithPrivateKey` (the
 * Beekeeper-backed path) are NOT covered here. `@hiveio/beekeeper`,
 * `@hiveio/wax-signers-beekeeper` and `@hiveio/wax` are ESM-only packages
 * (no CJS "require" export condition) and this repo's mocha/ts-node setup
 * (matching packages/transaction and packages/renderer) runs tests under
 * CommonJS, where even a dynamic `import()` gets downleveled to `require()`
 * and fails the same way. Making that path testable here would need an
 * ESM-mode ts-node/mocha setup, a bigger, repo-wide tooling change out of
 * scope for this fix. That path's correctness was instead verified manually
 * this session: an isolated round-trip (encrypt then decrypt recovers the
 * original plaintext, including a case with a literal leading `#`) passed
 * both in-process and across two independent Node processes, ruling out
 * shared-state false positives.
 */
describe('memo-crypto: Keychain key-type casing (regression for #605 / #713)', () => {
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

  it('decryptMemoWithKeychain requests the capitalized "Memo" key type', async () => {
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
    expect(capturedMethod).to.equal('Memo');
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

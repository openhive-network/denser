import { describe, it, afterEach } from 'mocha';
import { expect } from 'chai';
import { encryptMemoWithKeychain, decryptMemoWithKeychain, stripEncryptedMemoMarker } from './memo-crypto';

/**
 * Regression coverage for gitlab.syncad.com/hive/denser#605 / #713: a real
 * teamvn -> quochuy transfer encrypted via Keychain produced ciphertext
 * nobody could decrypt, including the production wallet.hive.blog. Root
 * cause was `KeychainProvider` (from `@hiveio/wax-signers-keychain`)
 * forwarding wax's lowercase `TRole` ('memo') verbatim to the Keychain
 * window API, while the real extension's `encodeMessage` handler exact-matches
 * against the capitalized `KeychainKeyTypes` enum (hive-keychain-commons,
 * 'Memo') - a silent mismatch that made the extension fall back to the
 * recipient's POSTING key instead of throwing. `encryptMemoWithKeychain`
 * calls `window.hive_keychain` directly with the correct casing; the first
 * test below pins that exact string so it cannot regress silently again.
 *
 * Decoding was never affected by the casing bug (the extension's decode key
 * resolution normalizes case rather than exact-matching), so
 * `decryptMemoWithKeychain` was simplified to go through the standard
 * `KeychainProvider` instead of maintaining its own bypass - the second test
 * below pins its (lowercase, and correctly so) 'memo' role string instead.
 *
 * Second regression, found in review: the WIF/Beekeeper path did not follow
 * hive-js's `#`-marker convention (strip before encrypt, re-prepend after
 * decrypt), so its ciphertext embedded a literal `#` that every other Hive
 * client sees doubled on the wire, and it lost the leading `#` when
 * decrypting a correctly-encrypted (Keychain-origin) memo. `stripEncryptedMemoMarker`
 * (below) is the pure, synchronous half of that fix and is unit-tested
 * directly.
 *
 * Note: `encryptMemoWithPrivateKey`/`decryptMemoWithPrivateKey` in full (the
 * Beekeeper-backed calls themselves, not just the marker-stripping around
 * them) are NOT covered by an automated test here. `@hiveio/beekeeper`,
 * `@hiveio/wax-signers-beekeeper` and `@hiveio/wax` are ESM-only packages
 * (no CJS "require" export condition) and this repo's mocha/ts-node setup
 * (matching packages/transaction and packages/renderer) runs tests under
 * CommonJS, where even a dynamic `import()` gets downleveled to `require()`
 * and fails the same way. Making that path testable here would need an
 * ESM-mode ts-node/mocha setup, a bigger, repo-wide tooling change out of
 * scope for this fix.
 *
 * That path's correctness WAS instead verified this session with an
 * executed (not just claimed) plain-Node ESM script against the real
 * `@hiveio/beekeeper`/`wax-signers-beekeeper` packages, covering exactly
 * the cases the original round-trip-only claim here could not distinguish
 * (a bare round-trip is symmetric, so a consistently-missing strip/re-prepend
 * on both sides cancels out and still "passes"):
 *   1. Fixed encrypt("#secret") -> decrypt recovers "#secret" (round-trip, but
 *      now meaningful given 2-3 below).
 *   2. The *unfixed* encrypt/decrypt of "#secret" was run side-by-side: the
 *      raw decrypted payload came back as "#secret" - i.e. the ciphertext
 *      itself embeds a literal `#`, confirmed to be a *different* wire
 *      ciphertext than the fixed path produces. That's the reported bug
 *      (any other Hive client's own re-prepend turns this into "##secret").
 *   3. Cross-path: encrypted "secret" (simulating what Keychain produces,
 *      since Keychain already strips the marker internally), then decrypted
 *      it through the fixed WIF path and got back "#secret" - proving the
 *      WIF path now correctly restores the marker for Keychain-origin
 *      memos too, not just its own.
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

describe('memo-crypto: # marker stripping (hive-js convention, WIF/Beekeeper path)', () => {
  it('strips a leading #', () => {
    expect(stripEncryptedMemoMarker('#secret')).to.equal('secret');
  });

  it('only strips the first leading #, leaving embedded ones alone', () => {
    expect(stripEncryptedMemoMarker('##secret')).to.equal('#secret');
    expect(stripEncryptedMemoMarker('#se#cret')).to.equal('se#cret');
  });

  it('leaves text without a leading # untouched', () => {
    expect(stripEncryptedMemoMarker('secret')).to.equal('secret');
    expect(stripEncryptedMemoMarker('')).to.equal('');
  });
});

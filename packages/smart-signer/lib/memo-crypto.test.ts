import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createLazyAsyncSingleton, stripEncryptedMemoMarker } from './memo-crypto';

/**
 * Regression coverage for gitlab.syncad.com/hive/denser#605 / #713.
 *
 * - Keychain casing tests moved to `signer/keychain-memo-crypto.test.ts`
 *   (that logic moved behind the Signer interface, review finding on !1124).
 * - `stripEncryptedMemoMarker`: the WIF/Beekeeper path didn't follow hive-js's
 *   `#`-marker convention (strip before encrypt, re-prepend after decrypt),
 *   embedding/losing a literal `#` on the wire. Tested directly below.
 * - `createLazyAsyncSingleton`: `withEphemeralMemoProvider` re-initialized the
 *   expensive Beekeeper WASM instance on every call. Tested with a fake
 *   factory below, since the real Beekeeper can't run under CJS mocha.
 *
 * `encryptMemoWithPrivateKey`/`decryptMemoWithPrivateKey` (the Beekeeper calls
 * themselves) aren't covered here - `@hiveio/beekeeper`/`wax-signers-beekeeper`/
 * `@hiveio/wax` are ESM-only and can't run under this repo's mocha/CJS setup.
 * Verified instead via an executed plain-Node ESM script this session,
 * confirming: fixed round-trip recovers "#secret"; the unfixed path embeds a
 * literal `#` in the ciphertext (the reported bug); and a Keychain-origin
 * (already-stripped) ciphertext decrypts correctly through the fixed WIF path.
 */
describe('memo-crypto: createLazyAsyncSingleton (regression for beekeeper re-init)', () => {
  it('invokes the factory once and shares the same result across calls', async () => {
    let calls = 0;
    const getInstance = createLazyAsyncSingleton(async () => {
      calls++;
      return { id: calls };
    });

    const first = await getInstance();
    const second = await getInstance();

    expect(calls).to.equal(1);
    expect(second).to.equal(first);
  });

  it('shares the same in-flight promise for concurrent callers', async () => {
    let calls = 0;
    const getInstance = createLazyAsyncSingleton(async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 0));
      return calls;
    });

    const [a, b] = await Promise.all([getInstance(), getInstance()]);

    expect(calls).to.equal(1);
    expect(a).to.equal(b);
  });

  it('does not cache a rejection - the next call retries the factory', async () => {
    let calls = 0;
    const getInstance = createLazyAsyncSingleton(async () => {
      calls++;
      if (calls === 1) throw new Error('transient init failure');
      return calls;
    });

    let firstError: unknown;
    try {
      await getInstance();
    } catch (error) {
      firstError = error;
    }

    const second = await getInstance();

    expect(firstError).to.be.instanceOf(Error);
    expect(calls).to.equal(2);
    expect(second).to.equal(2);
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

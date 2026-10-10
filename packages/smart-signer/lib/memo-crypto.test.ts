import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The pino logger does not load under node's type stripping: stand in a silent one.
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier !== '@hive/ui/lib/logging') return nextResolve(specifier, context);
    return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
  }
});

const { createLazyAsyncSingleton, decryptMemoWithPrivateKey, encryptMemoWithPrivateKey, stripEncryptedMemoMarker } =
  await import('./memo-crypto.ts');

/**
 * Generated key pairs of no real account:
 * `getPrivateKeyFromPassword('stub-sender', 'memo', 'denser-fixture-sender-memo-key')` and
 * `getPrivateKeyFromPassword('gtg', 'memo', 'denser-fixture-memo-key')`.
 */
const SENDER_MEMO_WIF = '5JPHhxDdBo6aFU8GuGzpPE85FaNmndTKFFb1eiZMp35k8sNd5cw';
const RECIPIENT_MEMO_WIF = '5J1DMxmJAfPR2qvQoNEuUCAXNjfVQVLbNGe5ofQ7VkBCbydQWrg';
const RECIPIENT_MEMO_PUBLIC_KEY = 'STM6F7rvuwHGe2Goj2veXDeyNS5PKwBE1AtQYLK94Ds2MULXEuLPv';
const UNRELATED_WIF = '5JRaypasxMx1L97ZUX7YuC5Psb5EAbF821kkAGtBj7xCJFQcbLg';

const BASE58_CIPHERTEXT = /^#[1-9A-HJ-NP-Za-km-z]+$/;

describe('memo-crypto: encrypt/decrypt with a MEMO private key', () => {
  it('encrypts to `#` + base58 ciphertext that the recipient decrypts back to the memo', async () => {
    const encrypted = await encryptMemoWithPrivateKey(SENDER_MEMO_WIF, RECIPIENT_MEMO_PUBLIC_KEY, '#hello');

    assert.match(encrypted, BASE58_CIPHERTEXT);
    assert.ok(!encrypted.includes('hello'));
    // The `#` marker is not itself encrypted (hive-js convention): a decrypt that re-prepends it gives `#hello`, not `##hello`.
    assert.equal(await decryptMemoWithPrivateKey(RECIPIENT_MEMO_WIF, encrypted), '#hello');
  });

  it('the sender decrypts what it sent', async () => {
    const encrypted = await encryptMemoWithPrivateKey(SENDER_MEMO_WIF, RECIPIENT_MEMO_PUBLIC_KEY, '#hello');

    assert.equal(await decryptMemoWithPrivateKey(SENDER_MEMO_WIF, encrypted), '#hello');
  });

  it('rejects a key that is neither party of the memo', async () => {
    const encrypted = await encryptMemoWithPrivateKey(SENDER_MEMO_WIF, RECIPIENT_MEMO_PUBLIC_KEY, '#hello');

    await assert.rejects(decryptMemoWithPrivateKey(UNRELATED_WIF, encrypted));
  });
});

describe('memo-crypto: createLazyAsyncSingleton (regression for beekeeper re-init)', () => {
  it('invokes the factory once and shares the same result across calls', async () => {
    let calls = 0;
    const getInstance = createLazyAsyncSingleton(async () => {
      calls++;
      return { id: calls };
    });

    const first = await getInstance();
    const second = await getInstance();

    assert.equal(calls, 1);
    assert.equal(second, first);
  });

  it('shares the same in-flight promise for concurrent callers', async () => {
    let calls = 0;
    const getInstance = createLazyAsyncSingleton(async () => {
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 0));
      return calls;
    });

    const [a, b] = await Promise.all([getInstance(), getInstance()]);

    assert.equal(calls, 1);
    assert.equal(a, b);
  });

  it('does not cache a rejection - the next call retries the factory', async () => {
    let calls = 0;
    const getInstance = createLazyAsyncSingleton(async () => {
      calls++;
      if (calls === 1) throw new Error('transient init failure');
      return calls;
    });

    await assert.rejects(getInstance(), /transient init failure/);
    assert.equal(await getInstance(), 2);
    assert.equal(calls, 2);
  });
});

describe('memo-crypto: # marker stripping (hive-js convention, WIF/Beekeeper path)', () => {
  it('strips a leading #', () => {
    assert.equal(stripEncryptedMemoMarker('#secret'), 'secret');
  });

  it('only strips the first leading #, leaving embedded ones alone', () => {
    assert.equal(stripEncryptedMemoMarker('##secret'), '#secret');
    assert.equal(stripEncryptedMemoMarker('#se#cret'), 'se#cret');
  });

  it('leaves text without a leading # untouched', () => {
    assert.equal(stripEncryptedMemoMarker('secret'), 'secret');
    assert.equal(stripEncryptedMemoMarker(''), '');
  });
});

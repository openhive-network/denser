import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The pino logger does not load under node's type stripping: stand in a silent one.
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
// Under node's type stripping the `@smart-signer/` alias does not resolve.
const MEMO_LAYOUT_MODULE = new URL('./memo-layout.ts', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@hive/ui/lib/logging') return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
    if (specifier === '@smart-signer/lib/memo-layout') return { url: MEMO_LAYOUT_MODULE, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const {
  createLazyAsyncSingleton,
  decryptMemoWithPrivateKey,
  decryptMemoWithProvider,
  decryptMemoWithSnap,
  encryptMemoWithPrivateKey,
  encryptMemoWithProvider,
  encryptMemoWithSnap,
  stripEncryptedMemoMarker
} = await import('./memo-crypto.ts');
const { MemoLayoutError } = await import('./memo-layout.ts');

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

/**
 * `hello` from the sender's to the recipient's memo key, as the Hive MetaMask snap returns it:
 * written by the wax build the snap bundles (1.27.6-rc7-stable.250416082029, with beekeeper
 * 1.27.11-stable.250425192022), and decrypted back by it.
 */
const SNAP_LAYOUT_MEMO =
  '#13whAjEP8yNkzjAWX7nBXW77JeiRQ9sMsYzmoKP7weBQvRN7ZyABs3rx9FCnWrk2GfWM64LyPv3zAiYBCNWNUSdd2uVD3rXt7rVfs9gjN2Bh73hMCGHyDVuLbLmsg13qg3';
/** The same memo in the standard layout. */
const STANDARD_LAYOUT_MEMO =
  '#FB3ixmVu3H4rLeNYJgnvshASjT6HyrVCgdR8KwHgUmh7EuoazS8Nj1vzZqTDnHsvzi255h2thXsvNmvmqzJMgPaaQcFjp8s8bpUNbDBdfooyNSvt5H7Dh7kj47rWiMVWc';

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

  it('decrypts a memo the MetaMask snap wrote in its own layout', async () => {
    assert.equal(await decryptMemoWithPrivateKey(RECIPIENT_MEMO_WIF, SNAP_LAYOUT_MEMO), '#hello');
    assert.equal(await decryptMemoWithPrivateKey(RECIPIENT_MEMO_WIF, STANDARD_LAYOUT_MEMO), '#hello');
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

/**
 * A pass-through provider like wax's MetaMaskProvider, whose snap gets the buffer
 * untouched: "encrypts" to `#` + the plaintext reversed, so the test can see
 * exactly which plaintext reached the provider and which came back.
 */
const createPassThroughProvider = () => {
  const received: { encrypt?: [string, string]; decrypt?: string } = {};
  const provider = {
    encryptData: async (buffer: unknown, recipient: string) => {
      assert.equal(typeof buffer, 'string');
      received.encrypt = [String(buffer), recipient];
      return '#' + [...String(buffer)].reverse().join('');
    },
    decryptData: async (buffer: string) => {
      received.decrypt = buffer;
      return [...buffer.slice(1)].reverse().join('');
    }
  };
  return { provider, received };
};

describe('memo-crypto: # marker around a pass-through provider (MetaMask path)', () => {
  it('strips the marker before the provider encrypts', async () => {
    const { provider, received } = createPassThroughProvider();

    assert.equal(await encryptMemoWithProvider(provider, RECIPIENT_MEMO_PUBLIC_KEY, '#hello'), '#olleh');
    assert.deepEqual(received.encrypt, ['hello', RECIPIENT_MEMO_PUBLIC_KEY]);
  });

  it('re-prepends the marker after the provider decrypts, round-tripping to a single #', async () => {
    const { provider, received } = createPassThroughProvider();
    const encrypted = await encryptMemoWithProvider(provider, RECIPIENT_MEMO_PUBLIC_KEY, '#hello');

    assert.equal(await decryptMemoWithProvider(provider, encrypted), '#hello');
    assert.equal(received.decrypt, '#olleh');
  });

  it('propagates a provider rejection', async () => {
    const provider = {
      encryptData: async () => {
        throw new Error('snap rejected');
      },
      decryptData: async () => {
        throw new Error('snap rejected');
      }
    };

    await assert.rejects(encryptMemoWithProvider(provider, RECIPIENT_MEMO_PUBLIC_KEY, '#hello'), /snap rejected/);
    await assert.rejects(decryptMemoWithProvider(provider, '#olleh'), /snap rejected/);
  });
});

/** Stands in for the Hive MetaMask snap: returns `SNAP_LAYOUT_MEMO` and decrypts only that. */
const createSnapProvider = () => {
  const received: { encrypt?: [unknown, string]; decrypt?: string } = {};
  const provider = {
    encryptData: async (buffer: unknown, recipient: string) => {
      received.encrypt = [buffer, recipient];
      return SNAP_LAYOUT_MEMO;
    },
    decryptData: async (buffer: string) => {
      received.decrypt = buffer;
      if (buffer !== SNAP_LAYOUT_MEMO) throw new Error('Could not load the crypto memo content from given string');
      return 'hello';
    }
  };
  return { provider, received };
};

describe('memo-crypto: the Hive MetaMask snap', () => {
  it('encrypts the plaintext without its # for the recipient memo key, and returns a standard memo', async () => {
    const { provider, received } = createSnapProvider();

    const encrypted = await encryptMemoWithSnap(provider, RECIPIENT_MEMO_PUBLIC_KEY, '#hello');

    assert.deepEqual(received.encrypt, ['hello', RECIPIENT_MEMO_PUBLIC_KEY]);
    assert.equal(encrypted, STANDARD_LAYOUT_MEMO);
    assert.equal(await decryptMemoWithPrivateKey(RECIPIENT_MEMO_WIF, encrypted), '#hello');
  });

  it('hands the snap a standard memo, # included, in the layout it parses', async () => {
    const { provider, received } = createSnapProvider();

    assert.equal(await decryptMemoWithSnap(provider, STANDARD_LAYOUT_MEMO), '#hello');
    assert.equal(received.decrypt, SNAP_LAYOUT_MEMO);
  });

  it('hands the snap a memo already in its layout unchanged', async () => {
    const { provider, received } = createSnapProvider();

    assert.equal(await decryptMemoWithSnap(provider, SNAP_LAYOUT_MEMO), '#hello');
    assert.equal(received.decrypt, SNAP_LAYOUT_MEMO);
  });

  it('rejects text that is not an encrypted memo before asking the snap', async () => {
    const { provider, received } = createSnapProvider();

    await assert.rejects(decryptMemoWithSnap(provider, '#not a memo'), MemoLayoutError);
    assert.equal(received.decrypt, undefined);
  });
});

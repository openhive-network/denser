import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The pino logger does not load under node's type stripping: stand in a silent one.
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@hive/ui/lib/logging') return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { createLazyAsyncSingleton, signDigestWithWif } = await import('./ephemeral-beekeeper.ts');
const { createWaxFoundation } = await import('@hiveio/wax');

/** A generated key pair of no real account: `getPrivateKeyFromPassword('stub-sender', 'memo', 'denser-fixture-sender-memo-key')`. */
const WIF = '5JPHhxDdBo6aFU8GuGzpPE85FaNmndTKFFb1eiZMp35k8sNd5cw';
const PUBLIC_KEY = 'STM761jB637TiV4qFj5AHFzGrPwpZRz4bSDDqKTe74YFuJx95GKQe';
const DIGEST = 'a3c5f1e0b9d24c7e8f6a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f506';
/** hb-auth's instance locks after the safe-storage lock time, 900s by default. */
const PAST_SAFE_STORAGE_LOCK_TIME_MS = 25 * 60 * 1000;

async function signerOf(digest: string, signature: string): Promise<string> {
  const wax = await createWaxFoundation();
  return wax.getPublicKeyFromSignature(digest, signature);
}

describe('ephemeral-beekeeper: signDigestWithWif', () => {
  it('signs the digest with the given key', async () => {
    const signature = await signDigestWithWif(DIGEST, WIF);

    assert.match(signature, /^[0-9a-f]{130}$/);
    assert.equal(await signerOf(DIGEST, signature), PUBLIC_KEY);
  });

  it('rejects a malformed key', async () => {
    await assert.rejects(signDigestWithWif(DIGEST, 'not-a-wif'));
  });

  // Beekeeper's unlock timeout counts idle time across the whole (shared, page-lifetime) instance.
  it('still signs after the page has been idle past the safe-storage lock time', async (t) => {
    await signDigestWithWif(DIGEST, WIF);
    t.after(() => mock.timers.reset());
    mock.timers.enable({ apis: ['Date'], now: Date.now() });
    mock.timers.tick(PAST_SAFE_STORAGE_LOCK_TIME_MS);

    const signature = await signDigestWithWif(DIGEST, WIF);

    assert.equal(await signerOf(DIGEST, signature), PUBLIC_KEY);
    // And again: a timed-out instance would keep failing, not only on the first call.
    assert.equal(await signerOf(DIGEST, await signDigestWithWif(DIGEST, WIF)), PUBLIC_KEY);
  });
});

describe('ephemeral-beekeeper: createLazyAsyncSingleton (regression for beekeeper re-init)', () => {
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


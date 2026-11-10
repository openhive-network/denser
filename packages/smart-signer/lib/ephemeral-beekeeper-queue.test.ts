import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The pino logger does not load under node's type stripping: stand in a silent one.
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
// Beekeeper stands in as the fake below, so a test controls when its asynchronous calls settle.
const FAKE_BEEKEEPER_MODULE =
  'data:text/javascript,export default (options) => globalThis.createFakeBeekeeper(options);';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@hive/ui/lib/logging') return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
    if (specifier === '@hiveio/beekeeper') return { url: FAKE_BEEKEEPER_MODULE, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const BAD_WIF = 'not-a-wif';
const REFUSAL = /refuses a synchronous call while an asynchronous one runs/;

/**
 * Mimics Beekeeper's rule: a synchronous call (`createSession`, `close`, `getPublicKeys`, `hasWallet`)
 * throws while an asynchronous one is running on the instance. Records every refusal.
 */
const fake = {
  running: 0,
  refusals: [] as string[],
  async asyncCall<T>(result: () => T): Promise<T> {
    this.running++;
    try {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return result();
    } finally {
      this.running--;
    }
  },
  syncCall<T>(name: string, result: () => T): T {
    if (this.running > 0) {
      this.refusals.push(name);
      throw new Error(`${name}: beekeeper refuses a synchronous call while an asynchronous one runs`);
    }
    return result();
  }
};

function createFakeWallet() {
  const keys: string[] = [];
  return {
    importKey: (wif: string) =>
      fake.asyncCall(() => {
        if (wif === BAD_WIF) throw new Error('Invalid private key');
        keys.push(`STM-${wif}`);
        return `STM-${wif}`;
      }),
    signDigest: (publicKey: string, digest: string) => fake.asyncCall(() => `${publicKey}:${digest}`),
    getPublicKeys: () => fake.syncCall('getPublicKeys', () => [...keys])
  };
}

Object.assign(globalThis, {
  createFakeBeekeeper: async () => ({
    createSession: () =>
      fake.syncCall('createSession', () => ({
        createWallet: () => fake.asyncCall(() => ({ wallet: createFakeWallet() })),
        hasWallet: () => fake.syncCall('hasWallet', () => true),
        close: () => fake.syncCall('close', () => undefined)
      }))
  })
});

const { signDigestWithWif, withEphemeralWallet } = await import('./ephemeral-beekeeper.ts');

describe('ephemeral-beekeeper: one queue for every call on the instance', () => {
  it('runs a single call unchanged', async () => {
    assert.equal(await signDigestWithWif('digest', 'wif'), 'STM-wif:digest');
  });

  it('runs overlapping calls one after another, so beekeeper refuses none', async () => {
    fake.refusals = [];

    const signatures = await Promise.all(
      ['a', 'b', 'c', 'd', 'e'].map((wif) => signDigestWithWif(`digest-${wif}`, wif))
    );

    assert.deepEqual(signatures, ['a', 'b', 'c', 'd', 'e'].map((wif) => `STM-${wif}:digest-${wif}`));
    assert.deepEqual(fake.refusals, []);
  });

  it('serializes a synchronous wallet call against another run\'s asynchronous ones', async () => {
    fake.refusals = [];

    const [keys] = await Promise.all([
      withEphemeralWallet('keys', async (wallet) => {
        await wallet.importKey('k');
        return wallet.getPublicKeys();
      }),
      signDigestWithWif('digest', 'other')
    ]);

    assert.deepEqual(keys, ['STM-k']);
    assert.deepEqual(fake.refusals, []);
  });

  it('rejects only the failing call; the calls queued after it still run', async () => {
    fake.refusals = [];

    const [before, failed, after] = await Promise.allSettled([
      signDigestWithWif('digest', 'before'),
      signDigestWithWif('digest', BAD_WIF),
      signDigestWithWif('digest', 'after')
    ]);

    assert.deepEqual(before, { status: 'fulfilled', value: 'STM-before:digest' });
    assert.equal(failed.status, 'rejected');
    assert.match(String(failed.status === 'rejected' && failed.reason), /Invalid private key/);
    assert.deepEqual(after, { status: 'fulfilled', value: 'STM-after:digest' });
    assert.deepEqual(fake.refusals, []);
  });

  it('the fake refuses a synchronous call during an asynchronous one, as beekeeper does', async () => {
    const pending = fake.asyncCall(() => undefined);
    assert.throws(() => fake.syncCall('createSession', () => undefined), REFUSAL);
    await pending;
  });
});

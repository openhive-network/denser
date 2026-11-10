import type { IBeekeeperInstance, IBeekeeperSession, IBeekeeperUnlockedWallet } from '@hiveio/beekeeper';

import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

/** Caches an async factory's result; a rejection isn't cached, so the next call retries. */
export function createLazyAsyncSingleton<T>(factory: () => Promise<T>): () => Promise<T> {
  let instance: Promise<T> | undefined;
  return () => {
    if (!instance) {
      instance = factory().catch((error) => {
        instance = undefined;
        throw error;
      });
    }
    return instance;
  };
}

// Beekeeper's WASM instance is expensive to init, so it's cached and reused;
// only the per-call session/wallet below is ephemeral.
// Beekeeper counts its unlock timeout over the whole instance, not per wallet: with a timeout
// (hb-auth's instance has the safe-storage lock time, 900s by default), the first call after the
// page sat idle that long throws "Wallet locked due to timeout", and so does every later one.
// Each wallet here lives for one call only, so the instance never times out.
const NO_UNLOCK_TIMEOUT = 0;

/** Runs each task only after every task enqueued before it has settled, in enqueue order. */
type SerialQueue = <T>(task: () => Promise<T>) => Promise<T>;

function createSerialQueue(): SerialQueue {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>) => {
    const run = tail.then(task);
    // A rejection belongs to its own caller only: the next task still runs.
    tail = run.catch(() => undefined);
    return run;
  };
}

interface QueuedBeekeeper {
  instance: IBeekeeperInstance;
  enqueue: SerialQueue;
}

// Beekeeper refuses a synchronous call (`createSession`, `close`, `getPublicKeys`, `hasWallet`)
// while an asynchronous one runs on the same instance, so every call on it goes through its queue.
const getBeekeeper = createLazyAsyncSingleton<QueuedBeekeeper>(async () => {
  // Loaded on first use, so Beekeeper's WASM stays out of the page's initial chunks.
  const { default: createBeekeeper } = await import('@hiveio/beekeeper');
  const instance = await createBeekeeper({ inMemory: true, unlockTimeout: NO_UNLOCK_TIMEOUT });
  return { instance, enqueue: createSerialQueue() };
});

/**
 * Starts loading the instance ahead of a signature, so the signature does not wait for Beekeeper's
 * JS and WASM. A failed load is only logged: the next signature retries it.
 */
export function warmEphemeralBeekeeper(): void {
  getBeekeeper().catch((error: unknown) => {
    logger.warn(error, 'Beekeeper warm-up failed; the next signature retries the load');
  });
}

/**
 * Runs `fn` with a temporary in-memory Beekeeper wallet, in a session closed afterwards, so no key
 * imported into it outlives the call. `walletPrefix` names the wallet, for Beekeeper's errors.
 * Runs are serialized on the shared instance: one starts only once every earlier one has closed its
 * session, so `fn` must not start another run, and must not leave a wallet call running when it returns.
 */
export async function withEphemeralWallet<T>(
  walletPrefix: string,
  fn: (wallet: IBeekeeperUnlockedWallet) => Promise<T>
): Promise<T> {
  const { instance, enqueue } = await getBeekeeper();
  return enqueue(() => runInEphemeralWallet(instance, walletPrefix, fn));
}

async function runInEphemeralWallet<T>(
  beekeeperInstance: IBeekeeperInstance,
  walletPrefix: string,
  fn: (wallet: IBeekeeperUnlockedWallet) => Promise<T>
): Promise<T> {
  let session: IBeekeeperSession;
  try {
    session = beekeeperInstance.createSession(crypto.randomUUID());
  } catch (error) {
    logger.error(error, 'withEphemeralWallet failed to create session');
    throw error;
  }

  try {
    // The instance is shared across calls, so the wallet name must be unique per call to avoid
    // colliding with a still-open wallet of a concurrent call.
    const { wallet } = await session.createWallet(`${walletPrefix}-${crypto.randomUUID()}`, undefined, true);
    return await fn(wallet);
  } finally {
    try {
      session.close();
    } catch (error) {
      // Cleanup failure shouldn't override a real error above, and shouldn't leak
      // into the shared, page-lifetime instance unnoticed.
      logger.error(error, 'withEphemeralWallet failed to close session');
    }
  }
}

/** Signs `digest` (hex) with the private key `wif`, kept only for this call. */
export async function signDigestWithWif(digest: string, wif: string): Promise<string> {
  return withEphemeralWallet('wif-sign', async (wallet) => {
    const publicKey = await wallet.importKey(wif);
    return wallet.signDigest(publicKey, digest);
  });
}

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
const getBeekeeperInstance = createLazyAsyncSingleton<IBeekeeperInstance>(async () => {
  // Loaded on first use, so Beekeeper's WASM stays out of the page's initial chunks.
  const { default: createBeekeeper } = await import('@hiveio/beekeeper');
  return createBeekeeper({ inMemory: true, unlockTimeout: NO_UNLOCK_TIMEOUT });
});

/**
 * Runs `fn` with a temporary in-memory Beekeeper wallet, in a session closed afterwards, so no key
 * imported into it outlives the call. `walletPrefix` names the wallet, for Beekeeper's errors.
 */
export async function withEphemeralWallet<T>(
  walletPrefix: string,
  fn: (wallet: IBeekeeperUnlockedWallet) => Promise<T>
): Promise<T> {
  const beekeeperInstance = await getBeekeeperInstance();

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

import type { TPublicKey } from '@hiveio/wax';
import type { BeekeeperProvider as IBeekeeperProvider } from '@hiveio/wax-signers-beekeeper';
import type { IBeekeeperInstance, IBeekeeperSession } from '@hiveio/beekeeper';

import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

// hive-js convention: leading `#` marks "encrypt this" but isn't itself
// encrypted - strip before encrypt, re-prepend after decrypt. Keychain does
// this internally; wax's BeekeeperProvider doesn't, so it's applied here
// only around the WIF/Beekeeper path.
const ENCRYPTED_MEMO_MARKER = '#';

export function stripEncryptedMemoMarker(memo: string): string {
  return memo.startsWith(ENCRYPTED_MEMO_MARKER) ? memo.slice(ENCRYPTED_MEMO_MARKER.length) : memo;
}

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
const getBeekeeperInstance = createLazyAsyncSingleton<IBeekeeperInstance>(async () => {
  const { default: createBeekeeper } = await import('@hiveio/beekeeper');
  return createBeekeeper({ inMemory: true });
});

/**
 * Imports a MEMO WIF into a temporary in-memory Beekeeper wallet, runs `fn`
 * with a provider bound to it, then closes the session (key never persists).
 */
async function withEphemeralMemoProvider<T>(
  memoPrivateKeyWif: string,
  fn: (provider: IBeekeeperProvider) => Promise<T>
): Promise<T> {
  // ESM-only packages; dynamic import so static require() (ts-node/mocha) doesn't break.
  // Kicked off alongside getBeekeeperInstance() (not after) so the cache-miss path still
  // races all three instead of serializing behind the other two.
  const beekeeperInstancePromise = getBeekeeperInstance();
  const [{ default: BeekeeperProvider }, { createWaxFoundation }] = await Promise.all([
    import('@hiveio/wax-signers-beekeeper'),
    import('@hiveio/wax')
  ]);

  const beekeeperInstance = await beekeeperInstancePromise;

  let session: IBeekeeperSession;
  try {
    session = beekeeperInstance.createSession(crypto.randomUUID());
  } catch (error) {
    logger.error(error, 'withEphemeralMemoProvider failed to create session');
    throw error;
  }

  try {
    // Beekeeper's WASM instance is now shared across calls (see getBeekeeperInstance
    // above), so the wallet name must be unique per call to avoid colliding with a
    // still-open wallet from a concurrent encrypt/decrypt call.
    const { wallet } = await session.createWallet(`memo-crypto-${crypto.randomUUID()}`, undefined, true);
    const publicKey = await wallet.importKey(memoPrivateKeyWif);
    const waxBase = await createWaxFoundation();
    const provider = BeekeeperProvider.for(waxBase, wallet, publicKey);
    return await fn(provider);
  } catch (error) {
    logger.error(error, 'withEphemeralMemoProvider failed');
    throw error;
  } finally {
    try {
      session.close();
    } catch (error) {
      // Cleanup failure shouldn't override a real error above, and shouldn't leak
      // into the shared, page-lifetime beekeeperInstance unnoticed.
      logger.error(error, 'withEphemeralMemoProvider failed to close session');
    }
  }
}

/** Decrypts a `#`-prefixed memo with a user-supplied MEMO WIF; re-prepends the marker. */
export async function decryptMemoWithPrivateKey(
  memoPrivateKeyWif: string,
  encodedMemo: string
): Promise<string> {
  const decrypted = await withEphemeralMemoProvider(memoPrivateKeyWif, (provider) =>
    provider.decryptData(encodedMemo)
  );
  return ENCRYPTED_MEMO_MARKER + decrypted;
}

/** Encrypts a memo with a user-supplied MEMO WIF for a recipient's MEMO public key; strips the marker first. */
export async function encryptMemoWithPrivateKey(
  memoPrivateKeyWif: string,
  toAccountMemoPublicKey: TPublicKey,
  memo: string
): Promise<string> {
  return withEphemeralMemoProvider(memoPrivateKeyWif, (provider) =>
    provider.encryptData(stripEncryptedMemoMarker(memo), toAccountMemoPublicKey)
  );
}

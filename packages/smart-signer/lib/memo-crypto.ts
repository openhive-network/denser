import type { AEncryptionProvider, TPublicKey } from '@hiveio/wax';
import type { BeekeeperProvider as IBeekeeperProvider } from '@hiveio/wax-signers-beekeeper';
import type { IBeekeeperInstance, IBeekeeperSession } from '@hiveio/beekeeper';

import { getLogger } from '@hive/ui/lib/logging';
import { ENCRYPTED_MEMO_MARKER, toSnapMemoLayout, toStandardMemoLayout } from '@smart-signer/lib/memo-layout';

const logger = getLogger('app');

// hive-js convention: leading `#` marks "encrypt this" but isn't itself
// encrypted - strip before encrypt, re-prepend after decrypt. Keychain does
// this internally; wax's BeekeeperProvider and MetaMaskProvider pass the
// buffer through untouched, so it's applied around those by the
// `*MemoWithProvider` wrappers below.
export function stripEncryptedMemoMarker(memo: string): string {
  return memo.startsWith(ENCRYPTED_MEMO_MARKER) ? memo.slice(ENCRYPTED_MEMO_MARKER.length) : memo;
}

export type MemoEncryptionProvider = Pick<AEncryptionProvider, 'encryptData' | 'decryptData'>;

/** Encrypts `memo` for `toAccountMemoPublicKey` through a provider that doesn't strip the `#` marker itself. */
export async function encryptMemoWithProvider(
  provider: MemoEncryptionProvider,
  toAccountMemoPublicKey: TPublicKey,
  memo: string
): Promise<string> {
  return provider.encryptData(stripEncryptedMemoMarker(memo), toAccountMemoPublicKey);
}

/** Decrypts `encodedMemo` through a provider that doesn't re-prepend the `#` marker itself. */
export async function decryptMemoWithProvider(
  provider: MemoEncryptionProvider,
  encodedMemo: string
): Promise<string> {
  return ENCRYPTED_MEMO_MARKER + (await provider.decryptData(encodedMemo));
}

/**
 * Encrypts `memo` through the Hive MetaMask snap and returns it as a standard Hive memo
 * (see `memo-layout`): the snap's own output is the right ciphertext from the sender's memo
 * key to `toAccountMemoPublicKey`, in a byte layout no other wallet reads.
 */
export async function encryptMemoWithSnap(
  provider: MemoEncryptionProvider,
  toAccountMemoPublicKey: TPublicKey,
  memo: string
): Promise<string> {
  return toStandardMemoLayout(await encryptMemoWithProvider(provider, toAccountMemoPublicKey, memo));
}

/** Decrypts a memo in either layout through the Hive MetaMask snap, which only parses its own. */
export async function decryptMemoWithSnap(provider: MemoEncryptionProvider, encodedMemo: string): Promise<string> {
  return decryptMemoWithProvider(provider, toSnapMemoLayout(encodedMemo));
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
  // Loaded on first use, so Beekeeper's WASM stays out of the page's initial chunks.
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

/**
 * Decrypts a `#`-prefixed memo with a user-supplied MEMO WIF; re-prepends the marker.
 * Also reads the snap's layout, so a memo sent with an earlier MetaMask build decodes too.
 */
export async function decryptMemoWithPrivateKey(
  memoPrivateKeyWif: string,
  encodedMemo: string
): Promise<string> {
  const standardMemo = toStandardMemoLayout(encodedMemo);
  return withEphemeralMemoProvider(memoPrivateKeyWif, (provider) => decryptMemoWithProvider(provider, standardMemo));
}

/** Encrypts a memo with a user-supplied MEMO WIF for a recipient's MEMO public key; strips the marker first. */
export async function encryptMemoWithPrivateKey(
  memoPrivateKeyWif: string,
  toAccountMemoPublicKey: TPublicKey,
  memo: string
): Promise<string> {
  return withEphemeralMemoProvider(memoPrivateKeyWif, (provider) =>
    encryptMemoWithProvider(provider, toAccountMemoPublicKey, memo)
  );
}

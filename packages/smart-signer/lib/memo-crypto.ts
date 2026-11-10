import type { AEncryptionProvider, TPublicKey } from '@hiveio/wax';
import type { BeekeeperProvider as IBeekeeperProvider } from '@hiveio/wax-signers-beekeeper';

import { getLogger } from '@hive/ui/lib/logging';
import {
  ENCRYPTED_MEMO_MARKER,
  requireEncryptedMemo,
  toSnapMemoLayout,
  toStandardMemoLayout
} from '@smart-signer/lib/memo-layout';
import { snapWritesStandardMemoLayout } from '@smart-signer/lib/metamask-snap-version';
import { withEphemeralWallet } from '@smart-signer/lib/ephemeral-beekeeper';

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

/**
 * Encrypts `memo` for `toAccountMemoPublicKey` through a provider that doesn't strip the `#` marker itself.
 *
 * @throws {EmptyEncryptedMemoError} when the provider returns no ciphertext.
 */
export async function encryptMemoWithProvider(
  provider: MemoEncryptionProvider,
  toAccountMemoPublicKey: TPublicKey,
  memo: string
): Promise<string> {
  return requireEncryptedMemo(await provider.encryptData(stripEncryptedMemoMarker(memo), toAccountMemoPublicKey));
}

/** Decrypts `encodedMemo` through a provider that doesn't re-prepend the `#` marker itself. */
export async function decryptMemoWithProvider(
  provider: MemoEncryptionProvider,
  encodedMemo: string
): Promise<string> {
  return ENCRYPTED_MEMO_MARKER + (await provider.decryptData(encodedMemo));
}

/**
 * Encrypts `memo` through the Hive MetaMask snap at `snapVersion` and returns a standard Hive memo
 * (see `memo-layout`), `#` included. A snap before 1.8.0 returns the right ciphertext in a byte layout
 * no other wallet reads, so its output is reordered; a later snap's is returned as it is, with the `#`
 * added when missing.
 */
export async function encryptMemoWithSnap(
  provider: MemoEncryptionProvider,
  snapVersion: string,
  toAccountMemoPublicKey: TPublicKey,
  memo: string
): Promise<string> {
  const encrypted = await encryptMemoWithProvider(provider, toAccountMemoPublicKey, memo);
  if (!snapWritesStandardMemoLayout(snapVersion)) return toStandardMemoLayout(encrypted);
  // Snap 1.8.0's `hive_encrypt` returns its bundled wax `encrypt()` (1.28.8), whose
  // `crypto_memo_dump_string` writes the `#`; wax-signers-metamask passes it through untouched.
  // The snap's `hive_decrypt` returns no `#`, so a bare ciphertext is not ruled out for later
  // snaps: add the marker rather than refuse the memo. Whether it is encrypted to the recipient
  // is still checked by `requireEncryptedMemoFor`.
  return encrypted.startsWith(ENCRYPTED_MEMO_MARKER) ? encrypted : ENCRYPTED_MEMO_MARKER + encrypted;
}

/**
 * Decrypts a memo in either layout through the Hive MetaMask snap at `snapVersion`. A snap before
 * 1.8.0 only parses its own layout, so the memo is reordered for it; a later snap reads both.
 */
export async function decryptMemoWithSnap(
  provider: MemoEncryptionProvider,
  snapVersion: string,
  encodedMemo: string
): Promise<string> {
  return decryptMemoWithProvider(
    provider,
    snapWritesStandardMemoLayout(snapVersion) ? encodedMemo : toSnapMemoLayout(encodedMemo)
  );
}

/**
 * Imports a MEMO WIF into a temporary in-memory Beekeeper wallet, runs `fn`
 * with a provider bound to it, then closes the session (key never persists).
 */
async function withEphemeralMemoProvider<T>(
  memoPrivateKeyWif: string,
  fn: (provider: IBeekeeperProvider) => Promise<T>
): Promise<T> {
  // Loaded on first use, so the WASM stays out of the page's initial chunks. Kicked off
  // before the wallet is created (not inside it) so the cache-miss path still races the
  // Beekeeper instance, and wax loads without holding Beekeeper's queue.
  const depsPromise = Promise.all([import('@hiveio/wax-signers-beekeeper'), import('@hiveio/wax')]).then(
    async ([{ default: BeekeeperProvider }, { createWaxFoundation }]) => ({
      BeekeeperProvider,
      waxBase: await createWaxFoundation()
    })
  );
  try {
    return await withEphemeralWallet('memo-crypto', async (wallet) => {
      const publicKey = await wallet.importKey(memoPrivateKeyWif);
      const { BeekeeperProvider, waxBase } = await depsPromise;
      const provider = BeekeeperProvider.for(waxBase, wallet, publicKey);
      return await fn(provider);
    });
  } catch (error) {
    logger.error(error, 'withEphemeralMemoProvider failed');
    throw error;
  }
}

/**
 * Decrypts a `#`-prefixed memo with a user-supplied MEMO WIF; re-prepends the marker.
 * wax reads the legacy layout too, so a memo sent through MetaMask snap 1.6/1.7 decodes as well.
 */
export async function decryptMemoWithPrivateKey(
  memoPrivateKeyWif: string,
  encodedMemo: string
): Promise<string> {
  return withEphemeralMemoProvider(memoPrivateKeyWif, (provider) => decryptMemoWithProvider(provider, encodedMemo));
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

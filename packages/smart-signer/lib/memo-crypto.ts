import type { TPublicKey } from '@hiveio/wax';
import type { BeekeeperProvider as IBeekeeperProvider } from '@hiveio/wax-signers-beekeeper';
import KeychainProvider from '@hiveio/wax-signers-keychain';

import { getLogger } from '@hive/ui/lib/logging';

// Also declared in signer-keychain.ts (byte-for-byte identical) - TypeScript
// merges ambient `declare global` blocks harmlessly, but this repo's
// mocha/ts-node setup type-checks files individually rather than as one
// program, so dropping this in favor of relying on the other file's
// declaration breaks this file's own standalone type-check. Kept duplicated
// on purpose.
declare global {
  interface Window {
    hive_keychain: any;
  }
}

const logger = getLogger('app');

// Hive's memo convention (hive-js's memo.js): a leading `#` in the user-typed
// plaintext marks "encrypt this", but that marker character itself is NOT
// part of what gets encrypted - it's stripped before encryption and
// re-prepended after decryption, so the decoded text matches what the user
// originally typed. The Keychain browser extension (encodeMessage /
// requestVerifyKey) already implements this convention internally via its
// own hive-js dependency. wax's BeekeeperProvider does not: it encrypts
// whatever string it's given verbatim. Without stripping/re-prepending here,
// the WIF path's ciphertext embeds a literal `#` that every other Hive
// client sees doubled on the wire (`##...`), and decrypting a
// correctly-encrypted (Keychain-origin) memo through the WIF path loses the
// leading `#` entirely. Applied only around BeekeeperProvider - Keychain's
// own encode/decode already handles this and must not be double-adjusted.
const ENCRYPTED_MEMO_MARKER = '#';

export function stripEncryptedMemoMarker(memo: string): string {
  return memo.startsWith(ENCRYPTED_MEMO_MARKER) ? memo.slice(ENCRYPTED_MEMO_MARKER.length) : memo;
}

interface KeychainCallbackResponse {
  success: boolean;
  error?: string;
  result?: string;
}

/**
 * Calls the Hive Keychain extension directly for memo *encoding*,
 * bypassing `@hiveio/wax-signers-keychain`'s `KeychainProvider`.
 *
 * `KeychainProvider` forwards wax's lowercase `TRole` (`'memo'`) verbatim as
 * the Keychain request's `method` field, but the real extension's
 * `encodeMessage` handler does an exact-match comparison against the
 * capitalized `KeychainKeyTypes` convention (`'Memo'`) - see
 * `hive-keychain-commons`'s `KeychainKeyTypes` enum. `data.method ===
 * KeychainKeyTypes.memo` (`'memo' === 'Memo'` is false) and silently falls
 * back to the account's POSTING public key, producing ciphertext nobody's
 * real MEMO key can ever decrypt. Transaction signing is unaffected (it
 * resolves keys by matching public keys against required authorities, not
 * by this string). Decoding (`requestVerifyKey`) is unaffected too - its
 * key resolution normalizes case rather than exact-matching - so
 * `decryptMemoWithKeychain` below uses the standard `KeychainProvider`
 * instead of this bypass.
 */
function requestKeychain(
  invoke: (callback: (response: KeychainCallbackResponse) => void) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    invoke((response) => {
      if (!response.success || response.error || response.result === undefined) {
        reject(new Error(response.error ?? 'Keychain request failed'));
      } else {
        resolve(response.result);
      }
    });
  });
}

/**
 * Imports a MEMO private key (WIF) into a temporary, in-memory-only
 * Beekeeper wallet, runs `fn` with an encryption provider bound to it, then
 * destroys the wallet. The key is never persisted to storage.
 */
async function withEphemeralMemoProvider<T>(
  memoPrivateKeyWif: string,
  fn: (provider: IBeekeeperProvider) => Promise<T>
): Promise<T> {
  // Dynamic imports: @hiveio/beekeeper, @hiveio/wax-signers-beekeeper and
  // @hiveio/wax are ESM-only (no CJS "require" export condition), so a
  // static import breaks CJS tooling (e.g. ts-node/mocha). This also lazily
  // loads the beekeeper WASM payload only when this path actually runs.
  const [{ default: createBeekeeper }, { default: BeekeeperProvider }, { createWaxFoundation }] = await Promise.all([
    import('@hiveio/beekeeper'),
    import('@hiveio/wax-signers-beekeeper'),
    import('@hiveio/wax')
  ]);

  const beekeeperInstance = await createBeekeeper({ inMemory: true });
  try {
    const session = beekeeperInstance.createSession(crypto.randomUUID());
    const { wallet } = await session.createWallet('memo-crypto', undefined, true);
    const publicKey = await wallet.importKey(memoPrivateKeyWif);
    const waxBase = await createWaxFoundation();
    const provider = BeekeeperProvider.for(waxBase, wallet, publicKey);
    return await fn(provider);
  } catch (error) {
    logger.error(error, 'withEphemeralMemoProvider failed');
    throw error;
  } finally {
    await beekeeperInstance.delete();
  }
}

/**
 * Decrypts an encrypted memo (`#`-prefixed) using the Hive Keychain
 * extension. Requires the account's MEMO key to be present in Keychain.
 *
 * Goes through the standard `KeychainProvider` (unlike `encryptMemoWithKeychain`
 * below, which bypasses it) - the extension's decode handler resolves the key
 * via case-normalizing logic, not an exact string match, so `KeychainProvider`'s
 * lowercase `'memo'` role works correctly here. Only encode has the casing bug.
 */
export async function decryptMemoWithKeychain(username: string, encodedMemo: string): Promise<string> {
  const provider = KeychainProvider.for(username, 'memo');
  return provider.decryptData(encodedMemo);
}

/**
 * Decrypts an encrypted memo (`#`-prefixed) using a user-supplied MEMO
 * private key (WIF).
 *
 * Re-prepends the `#` marker to the decrypted plaintext - see
 * ENCRYPTED_MEMO_MARKER above. Unconditional, matching hive-js: every
 * encrypted memo's decoded text is displayed with a leading `#`, regardless
 * of what was originally typed before encryption.
 */
export async function decryptMemoWithPrivateKey(
  memoPrivateKeyWif: string,
  encodedMemo: string
): Promise<string> {
  const decrypted = await withEphemeralMemoProvider(memoPrivateKeyWif, (provider) =>
    provider.decryptData(encodedMemo)
  );
  return ENCRYPTED_MEMO_MARKER + decrypted;
}

/**
 * Encrypts a memo (destined for `toAccount`) using the Hive Keychain
 * extension. Requires `fromAccount`'s MEMO key to be present in Keychain.
 */
export async function encryptMemoWithKeychain(
  fromAccount: string,
  toAccount: string,
  memo: string
): Promise<string> {
  return requestKeychain((callback) =>
    window.hive_keychain.requestEncodeMessage(fromAccount, toAccount, memo, 'Memo', callback)
  );
}

/**
 * Encrypts a memo using a user-supplied MEMO private key (WIF), for a
 * recipient identified by their MEMO public key.
 *
 * Strips a leading `#` from `memo` before encrypting - see
 * ENCRYPTED_MEMO_MARKER above. Unconditional, matching hive-js.
 */
export async function encryptMemoWithPrivateKey(
  memoPrivateKeyWif: string,
  toAccountMemoPublicKey: TPublicKey,
  memo: string
): Promise<string> {
  return withEphemeralMemoProvider(memoPrivateKeyWif, (provider) =>
    provider.encryptData(stripEncryptedMemoMarker(memo), toAccountMemoPublicKey)
  );
}

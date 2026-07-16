import type { TPublicKey } from '@hiveio/wax';
import type { BeekeeperProvider as IBeekeeperProvider } from '@hiveio/wax-signers-beekeeper';

import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

declare global {
  interface Window {
    hive_keychain: any;
  }
}

interface KeychainCallbackResponse {
  success: boolean;
  error?: string;
  result?: string;
}

/**
 * Calls the Hive Keychain extension directly for memo encode/decode,
 * bypassing `@hiveio/wax-signers-keychain`'s `KeychainProvider`.
 *
 * `KeychainProvider` forwards wax's lowercase `TRole` (`'memo'`) verbatim as
 * the Keychain request's `method` field, but the real extension expects the
 * capitalized `KeychainKeyTypes` convention (`'Memo'`) - see
 * `hive-keychain-commons`'s `KeychainKeyTypes` enum. The extension's
 * `encodeMessage` handler does `data.method === KeychainKeyTypes.memo`
 * (`'memo' === 'Memo'` is false) and silently falls back to the account's
 * POSTING public key, producing ciphertext nobody's real MEMO key can ever
 * decrypt. Transaction signing is unaffected (it resolves keys by matching
 * public keys against required authorities, not by this string), so only
 * memo encode/decode need this workaround.
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
 */
export async function decryptMemoWithKeychain(username: string, encodedMemo: string): Promise<string> {
  return requestKeychain((callback) =>
    window.hive_keychain.requestVerifyKey(username, encodedMemo, 'Memo', callback)
  );
}

/**
 * Decrypts an encrypted memo (`#`-prefixed) using a user-supplied MEMO
 * private key (WIF).
 */
export async function decryptMemoWithPrivateKey(
  memoPrivateKeyWif: string,
  encodedMemo: string
): Promise<string> {
  return withEphemeralMemoProvider(memoPrivateKeyWif, (provider) => provider.decryptData(encodedMemo));
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
 */
export async function encryptMemoWithPrivateKey(
  memoPrivateKeyWif: string,
  toAccountMemoPublicKey: TPublicKey,
  memo: string
): Promise<string> {
  return withEphemeralMemoProvider(memoPrivateKeyWif, (provider) =>
    provider.encryptData(memo, toAccountMemoPublicKey)
  );
}

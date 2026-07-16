import KeychainProvider from '@hiveio/wax-signers-keychain';
import BeekeeperProvider from '@hiveio/wax-signers-beekeeper';
import createBeekeeper from '@hiveio/beekeeper';
import { createWaxFoundation } from '@hiveio/wax';

import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

/**
 * Decrypts an encrypted memo (`#`-prefixed) using the Hive Keychain
 * extension. Requires the account's MEMO key to be present in Keychain.
 */
export async function decryptMemoWithKeychain(username: string, encodedMemo: string): Promise<string> {
  const provider = KeychainProvider.for(username, 'memo');
  return provider.decryptData(encodedMemo);
}

/**
 * Decrypts an encrypted memo (`#`-prefixed) using a user-supplied MEMO
 * private key (WIF). The key is imported into a temporary, in-memory-only
 * Beekeeper wallet that is destroyed immediately after use - it is never
 * persisted to storage.
 */
export async function decryptMemoWithPrivateKey(memoPrivateKeyWif: string, encodedMemo: string): Promise<string> {
  const beekeeperInstance = await createBeekeeper({ inMemory: true });
  try {
    const session = beekeeperInstance.createSession(crypto.randomUUID());
    const { wallet } = await session.createWallet('decode-memo', undefined, true);
    const publicKey = await wallet.importKey(memoPrivateKeyWif);
    const waxBase = await createWaxFoundation();
    const provider = BeekeeperProvider.for(waxBase, wallet, publicKey);
    return await provider.decryptData(encodedMemo);
  } catch (error) {
    logger.error(error, 'decryptMemoWithPrivateKey failed');
    throw error;
  } finally {
    await beekeeperInstance.delete();
  }
}

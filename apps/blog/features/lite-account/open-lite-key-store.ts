import { liteKeyStoreKind, type StoredLiteIdentity } from './lite-identity-record';
import type { LiteKeyStore } from './lite-key-store';

/**
 * `identity`'s key store for the chain `chainId`, loading what signing needs on the first call: the
 * signing package, and hb-auth's wallet only for an identity whose keys are in Safe Storage.
 */
export async function openLiteKeyStore(identity: StoredLiteIdentity, chainId: string): Promise<LiteKeyStore> {
  const { liteKeyStore } = await import('./lite-key-store');
  if (liteKeyStoreKind(identity) === 'local') return liteKeyStore(identity, chainId);
  const { browserLiteWallet } = await import('./lite-wallet-browser');
  return liteKeyStore(identity, chainId, browserLiteWallet);
}

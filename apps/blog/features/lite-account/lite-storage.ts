/* eslint-disable no-restricted-properties -- Enumerates the lite keys of localStorage to remove them */

import { getLogger } from '@ui/lib/logging';
import { getStorageItem } from '@ui/lib/storage-with-ttl';
import { removeStorageItemAndNotify } from '@ui/lib/storage-with-ttl-notify';
import { liteKeyStoreKind, readStoredLiteIdentity, type StoredLiteIdentity } from './lite-identity-record.ts';

const logger = getLogger('app');

/** Every key of the lite flows' storage starts with it: the identity, drafts, queue and hand-off marks. */
const LITE_STORAGE_PREFIX = 'lite-';

/** The device-held lite identity, see `useLiteIdentity`. */
export const LITE_IDENTITY_STORAGE_KEY = 'lite-identity';

/** The browser's client id for the gateway: it belongs to the device, not to a lite account. */
export const LITE_CLIENT_ID_STORAGE_KEY = 'lite-client-id';

/** Removes a Safe Storage identity's entry from hb-auth's wallet. */
export type LiteWalletRemover = (identity: StoredLiteIdentity) => Promise<void>;

/** This browser's wallet, loaded only for an identity whose keys are in it. */
const removeFromBrowserWallet: LiteWalletRemover = async (identity) => {
  const [{ liteWalletClient }, { removeWalletEntry }] = await Promise.all([
    import('./lite-wallet-browser'),
    import('./lite-wallet')
  ]);
  await removeWalletEntry(identity, await liteWalletClient());
};

/**
 * Forgets the browser's lite account: removes its identity (the only copy of its key) and every
 * lite draft, queued post and sign-in mark, notifying this tab's hooks. The client id is kept. An
 * identity whose keys are in Safe Storage is first removed from the wallet (`removeFromWallet`);
 * when that fails it is logged and the account is forgotten all the same, its entry left locked
 * under its password and out of every list.
 */
export async function forgetLiteAccount(removeFromWallet: LiteWalletRemover = removeFromBrowserWallet): Promise<void> {
  const identity = readStoredLiteIdentity(getStorageItem(LITE_IDENTITY_STORAGE_KEY));
  if (identity && liteKeyStoreKind(identity) === 'safe-storage') {
    try {
      await removeFromWallet(identity);
    } catch (error) {
      logger.error(error, 'Could not remove the lite account %s from Safe Storage; forgetting it anyway', identity.name);
    }
  }
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(LITE_STORAGE_PREFIX) && key !== LITE_CLIENT_ID_STORAGE_KEY) keys.push(key);
  }
  keys.forEach((key) => removeStorageItemAndNotify(key));
}

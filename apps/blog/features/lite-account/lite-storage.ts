/* eslint-disable no-restricted-properties -- Enumerates the lite keys of localStorage to remove them */

import { removeStorageItemAndNotify } from '@ui/lib/storage-with-ttl-notify';

/** Every key of the lite flows' storage starts with it: the identity, drafts, queue and hand-off marks. */
const LITE_STORAGE_PREFIX = 'lite-';

/** The device-held lite identity, see `useLiteIdentity`. */
export const LITE_IDENTITY_STORAGE_KEY = 'lite-identity';

/** The browser's client id for the gateway: it belongs to the device, not to a lite account. */
export const LITE_CLIENT_ID_STORAGE_KEY = 'lite-client-id';

/**
 * Forgets the browser's lite account: removes its identity (the only copy of its key) and every
 * lite draft, queued post and sign-in mark, notifying this tab's hooks. The client id is kept.
 */
export function forgetLiteAccount(): void {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(LITE_STORAGE_PREFIX) && key !== LITE_CLIENT_ID_STORAGE_KEY) keys.push(key);
  }
  keys.forEach((key) => removeStorageItemAndNotify(key));
}

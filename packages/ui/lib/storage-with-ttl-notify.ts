/* eslint-disable no-restricted-properties -- Reads the raw localStorage value to fill the StorageEvent */

import { removeStorageItem, setStorageItem } from './storage-with-ttl';

/**
 * The browser fires `storage` only in *other* tabs. These helpers optionally
 * dispatch a synthetic one on `window` so listeners in the writing tab see it too.
 */
export interface StorageNotifyOptions {
  /** Dispatch a `storage` event in the writing tab. Defaults to true. */
  dispatchSameTab?: boolean;
}

function dispatchSameTabStorageEvent(key: string, oldValue: string | null, newValue: string | null): void {
  window.dispatchEvent(
    new StorageEvent('storage', {
      key,
      newValue,
      oldValue,
      storageArea: window.localStorage
    })
  );
}

/**
 * Stores `value` under `key` with the given TTL (see `setStorageItem`) and,
 * unless `dispatchSameTab` is false, notifies same-tab `storage` listeners.
 */
export function setStorageItemAndNotify<T>(
  key: string,
  value: T,
  ttl: number | null,
  { dispatchSameTab = true }: StorageNotifyOptions = {}
): void {
  const oldValue = window.localStorage.getItem(key);
  setStorageItem(key, value, ttl);
  if (dispatchSameTab) {
    dispatchSameTabStorageEvent(key, oldValue, window.localStorage.getItem(key));
  }
}

/**
 * Removes `key` and, unless `dispatchSameTab` is false, notifies same-tab
 * `storage` listeners.
 */
export function removeStorageItemAndNotify(
  key: string,
  { dispatchSameTab = true }: StorageNotifyOptions = {}
): void {
  const oldValue = window.localStorage.getItem(key);
  removeStorageItem(key);
  if (dispatchSameTab) {
    dispatchSameTabStorageEvent(key, oldValue, null);
  }
}

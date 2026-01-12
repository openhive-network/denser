import { isBrowser } from '@ui/lib/logger';

const KEY_TYPES = ['active', 'posting'] as const;
export type KeyAuthorityType = (typeof KEY_TYPES)[number];

/**
 * Checks if the specified storage type (localStorage or sessionStorage) is available
 * and accessible in the current browser environment.
 *
 * @param storageType - The type of web storage to check ('localStorage' or 'sessionStorage')
 * @returns true if the storage type is available and accessible, false otherwise
 *
 * @example
 * if (isStorageAvailable('localStorage')) {
 *   localStorage.setItem('key', 'value');
 * }
 */
export function isStorageAvailable(storageType: 'localStorage' | 'sessionStorage'): boolean {
  try {
    if (!isBrowser()) return false;
    return storageType in window && window[storageType] !== null;
  } catch {
    return false;
  }
}

/**
 * Determines if the current page is loaded inside an iframe.
 * This is useful for security checks or adjusting behavior when embedded.
 *
 * @returns true if running inside an iframe, false if running in the top-level window
 *
 * @example
 * if (inIframe()) {
 *   console.log('Running in an iframe');
 * }
 */
export function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

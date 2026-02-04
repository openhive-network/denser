import { KeyType } from '@smart-signer/types/common';

/**
 * SessionStorage keys for Google OAuth redirect flow (Safari).
 * These keys are used to persist login context across the OAuth redirect.
 */
export const GOOGLE_OAUTH_CODE_KEY = 'google_oauth_code';
export const GOOGLE_OAUTH_ERROR_KEY = 'google_oauth_error';
export const GOOGLE_OAUTH_USERNAME_KEY = 'google_oauth_username';
export const GOOGLE_OAUTH_KEYTYPE_KEY = 'google_oauth_keyType';
export const GOOGLE_OAUTH_NONCE_KEY = 'google_oauth_nonce';

/**
 * TTL for Google OAuth sessionStorage data (30 minutes in milliseconds).
 * After this time, stale OAuth data will be cleaned up.
 */
export const GOOGLE_OAUTH_TTL_MS = 30 * 60 * 1000;

/**
 * Validates that a string is a valid KeyType.
 * @param value - The string value to validate
 * @returns true if the value is a valid KeyType
 */
export function isValidKeyType(value: string | null): value is KeyType {
  return value === KeyType.posting || value === KeyType.active;
}

/**
 * Encodes a string to URL-safe base64.
 * Replaces + with -, / with _, and removes = padding.
 */
export function encodeUrlSafeBase64(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a URL-safe base64 string.
 * Restores + and / characters and adds padding if needed.
 */
export function decodeUrlSafeBase64(str: string): string {
  // Restore standard base64 characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return atob(base64);
}

/**
 * Generates a cryptographically secure random nonce.
 * @returns A random string suitable for CSRF protection
 */
export function generateOAuthNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates that a redirect URL is safe (same-origin or relative path).
 * Prevents open redirect attacks.
 * @param url - The URL to validate
 * @returns true if the URL is safe to redirect to
 */
export function isValidReturnUrl(url: string): boolean {
  // Allow relative paths starting with /
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }

  // For absolute URLs, check if same origin
  try {
    const parsed = new URL(url);
    const current = new URL(window.location.origin);
    return parsed.origin === current.origin;
  } catch {
    return false;
  }
}

/**
 * Cleans up stale Google OAuth sessionStorage data.
 * Call this on app initialization to prevent abandoned OAuth flows
 * from leaving stale data indefinitely.
 */
export function cleanupStaleOAuthData(): void {
  if (typeof window === 'undefined') return;

  const timestampKey = 'google_oauth_timestamp';
  const timestamp = sessionStorage.getItem(timestampKey);

  if (timestamp) {
    const elapsed = Date.now() - parseInt(timestamp, 10);
    if (elapsed > GOOGLE_OAUTH_TTL_MS) {
      // Data is stale, clean it up
      sessionStorage.removeItem(GOOGLE_OAUTH_CODE_KEY);
      sessionStorage.removeItem(GOOGLE_OAUTH_ERROR_KEY);
      sessionStorage.removeItem(GOOGLE_OAUTH_USERNAME_KEY);
      sessionStorage.removeItem(GOOGLE_OAUTH_KEYTYPE_KEY);
      sessionStorage.removeItem(GOOGLE_OAUTH_NONCE_KEY);
      sessionStorage.removeItem(timestampKey);
    }
  }
}

/**
 * Sets OAuth data with timestamp for TTL tracking.
 */
export function setOAuthDataWithTimestamp(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('google_oauth_timestamp', Date.now().toString());
}

/**
 * Clears all OAuth data from sessionStorage.
 */
export function clearOAuthData(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(GOOGLE_OAUTH_CODE_KEY);
  sessionStorage.removeItem(GOOGLE_OAUTH_ERROR_KEY);
  sessionStorage.removeItem(GOOGLE_OAUTH_USERNAME_KEY);
  sessionStorage.removeItem(GOOGLE_OAUTH_KEYTYPE_KEY);
  sessionStorage.removeItem(GOOGLE_OAUTH_NONCE_KEY);
  sessionStorage.removeItem('google_oauth_timestamp');
}

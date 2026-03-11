import { getLogger } from '@hive/ui/lib/logging';
import { getCookie } from '@ui/lib/utils';
import { cookieName, languages } from '@/wallet/i18n/settings';

// Direct localStorage access is intentional: we read/write Condenser's legacy
// keys which have no TTL structure, plus one-time migration flags.
/* eslint-disable no-restricted-globals */

const logger = getLogger('app');

const MIGRATION_FLAG_KEY = 'condenser-wallet-migrated';

// Hive account names: 3-16 chars, start with letter, only lowercase + digits + dots + hyphens.
const ACCOUNT_NAME_REGEX = /^[a-z][a-z0-9.-]{2,15}$/;

export interface CondenserLoginData {
  username: string;
  postingWif: string;
  loginWithKeychain: boolean;
}

/**
 * Decodes a hex-encoded string to UTF-8.
 * Condenser stores autopost2 as hex-encoded tab-separated data.
 */
function hexToString(hex: string): string {
  const bytes = new Uint8Array(
    (hex.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16))
  );
  return new TextDecoder().decode(bytes);
}

/**
 * Parses the Condenser `autopost2` localStorage entry.
 *
 * Format (hex-encoded, tab-separated):
 * [0] username
 * [1] postingWif
 * [2] memoWif
 * [3] login_owner_pubkey
 * [4] login_with_keychain ("true" / "")
 * [5-11] other flags (hivesigner, hiveauth, tokens)
 */
export function parseAutopost2(): CondenserLoginData | null {
  try {
    const raw = localStorage.getItem('autopost2');
    if (!raw) return null;

    const decoded = hexToString(raw);
    const fields = decoded.split('\t');

    const username = fields[0]?.trim();
    if (!username || !ACCOUNT_NAME_REGEX.test(username)) return null;

    return {
      username,
      postingWif: fields[1] || '',
      loginWithKeychain: fields[4] === 'true'
    };
  } catch (error) {
    logger.error(error, 'Failed to parse Condenser autopost2');
    return null;
  }
}

/**
 * Migrates language preference from Condenser's `language` key
 * (stored via the `store` npm package as raw JSON) to Denser's `NEXT_LOCALE` cookie.
 * Only migrates if NEXT_LOCALE cookie doesn't already exist.
 */
export function migrateLanguage(): void {
  try {
    // Skip if Denser already has a language set via cookie
    if (getCookie(cookieName)) return;

    const raw = localStorage.getItem('language');
    if (!raw) return;

    // The `store` npm package JSON.stringifies the value, so we parse it
    let locale: string;
    try {
      locale = JSON.parse(raw);
    } catch {
      // If not valid JSON, try using the raw value
      locale = raw;
    }

    if (typeof locale === 'string' && languages.includes(locale)) {
      document.cookie = `${cookieName}=${locale}; path=/; SameSite=Lax`;
      logger.info('Condenser wallet migration: language "%s" migrated to %s cookie', locale, cookieName);
    }
  } catch (error) {
    logger.error(error, 'Condenser wallet migration: failed to migrate language');
  }
}

/**
 * Migrates API endpoint preference from Condenser's `user_preferred_api_endpoint` cookie
 * to Denser's `node-endpoint` localStorage key.
 *
 * Condenser stores the endpoint as a plain cookie value (URL string).
 * Denser reads it as JSON.parse(localStorage.getItem('node-endpoint')).
 *
 * Only migrates if `node-endpoint` is not already set.
 */
export function migrateApiEndpoint(): void {
  try {
    // Skip if Denser already has a custom endpoint
    if (localStorage.getItem('node-endpoint')) return;

    const endpoint = getCookie('user_preferred_api_endpoint');
    if (!endpoint) return;

    // Basic URL validation
    try {
      new URL(endpoint);
    } catch {
      logger.warn('Condenser wallet migration: invalid endpoint URL "%s"', endpoint);
      return;
    }

    // Denser stores endpoints as JSON-stringified values
    localStorage.setItem('node-endpoint', JSON.stringify(endpoint));
    logger.info('Condenser wallet migration: API endpoint "%s" migrated to node-endpoint', endpoint);
  } catch (error) {
    logger.error(error, 'Condenser wallet migration: failed to migrate API endpoint');
  }
}

/**
 * Removes known Condenser localStorage keys and cookies that are no longer needed.
 */
export function cleanupCondenserStorage(): void {
  const directKeys = ['autopost2', 'autopost', 'saveLogin', 'bump', 'language'];

  for (const key of directKeys) {
    localStorage.removeItem(key);
  }

  // Remove pattern-based keys
  const patterns = [/_previous_owner_authority_last_valid_time$/];

  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && patterns.some((p) => p.test(key))) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }

  // Remove Condenser's API endpoint cookie (expire it)
  document.cookie = 'user_preferred_api_endpoint=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function isAlreadyMigrated(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === '1';
}

export function markMigrated(): void {
  localStorage.setItem(MIGRATION_FLAG_KEY, '1');
}

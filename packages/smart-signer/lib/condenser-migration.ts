import { getLogger } from '@hive/ui/lib/logging';

// Direct localStorage access is intentional: we read/write Condenser's legacy
// keys which have no TTL structure, plus one-time migration flags.
/* eslint-disable no-restricted-globals */

const logger = getLogger('app');

// Hive account names: 3-16 chars, start with letter, only lowercase + digits + dots + hyphens.
const ACCOUNT_NAME_REGEX = /^[a-z][a-z0-9.-]{2,15}$/;

/** Condenser's login markers: their absence means there is no Condenser login to migrate. */
export const CONDENSER_LOGIN_KEYS = ['autopost2', 'autopost', 'saveLogin'];

const COMMON_CONDENSER_KEYS = [...CONDENSER_LOGIN_KEYS, 'bump', 'language'];
const COMMON_CONDENSER_KEY_PATTERNS = [/_previous_owner_authority_last_valid_time$/];

export interface CondenserLoginData {
  username: string;
  postingWif: string;
  loginWithKeychain: boolean;
}

/**
 * What differs between the apps migrating from their Condenser counterpart. Every step is
 * synchronous and handles its own errors.
 */
export interface CondenserMigrationProfile {
  /** localStorage key marking the migration done. */
  migratedFlagKey: string;
  /** Prefix of the migration's log messages, e.g. `Condenser migration`. */
  logLabel: string;
  /** Migrates the settings that need no login (language, API endpoint). */
  migrateSettings: () => void;
  /** Migrates the user's data before the login attempt; must be idempotent, as a login may be retried. */
  migrateUserData?: (username: string) => void;
  /** Cleans up when there is no Condenser login to migrate. */
  cleanupWithoutLogin: () => void;
  /** Removes Condenser's leftovers once the login is migrated or abandoned. */
  cleanup: (username: string) => void;
}

/**
 * Decodes a hex-encoded string to UTF-8.
 * Condenser stores autopost2 as hex-encoded tab-separated data.
 */
function hexToString(hex: string): string {
  const bytes = new Uint8Array((hex.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16)));
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
 * Reads Condenser's `language` key (stored via the `store` npm package as raw JSON).
 * Returns the locale when it is one of `languages`, otherwise null.
 */
export function readCondenserLanguage(languages: readonly string[]): string | null {
  const raw = localStorage.getItem('language');
  if (!raw) return null;

  // The `store` npm package JSON.stringifies the value, so we parse it
  let locale: unknown;
  try {
    locale = JSON.parse(raw);
  } catch {
    // If not valid JSON, try using the raw value
    locale = raw;
  }

  return typeof locale === 'string' && languages.includes(locale) ? locale : null;
}

/**
 * Removes the Condenser localStorage keys both apps leave behind, plus the app's own
 * `keys` and the keys matching `patterns`.
 */
export function removeCondenserKeys(keys: readonly string[] = [], patterns: readonly RegExp[] = []): void {
  for (const key of [...COMMON_CONDENSER_KEYS, ...keys]) {
    localStorage.removeItem(key);
  }

  const allPatterns = [...COMMON_CONDENSER_KEY_PATTERNS, ...patterns];
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && allPatterns.some((p) => p.test(key))) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

export function isAlreadyMigrated({ migratedFlagKey }: CondenserMigrationProfile): boolean {
  return localStorage.getItem(migratedFlagKey) === '1';
}

export function markMigrated({ migratedFlagKey }: CondenserMigrationProfile): void {
  localStorage.setItem(migratedFlagKey, '1');
}

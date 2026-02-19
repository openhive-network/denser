import { getLogger } from '@hive/ui/lib/logging';

// Direct localStorage access is intentional: we read/write Condenser's legacy
// keys which have no TTL structure, plus one-time migration flags.
/* eslint-disable no-restricted-globals */

const logger = getLogger('app');

const MIGRATION_FLAG_KEY = 'condenser-migrated';

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
    if (!username) return null;

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
 * Removes known Condenser localStorage keys that are no longer needed.
 * Does NOT remove vote weights or draft data (user confirmed those still work).
 */
export function cleanupCondenserStorage(): void {
  const directKeys = ['autopost2', 'autopost', 'saveLogin', 'bump', 'replyEditorData-rte'];

  for (const key of directKeys) {
    localStorage.removeItem(key);
  }

  // Remove pattern-based orphan keys
  const patterns = [
    /^showEditor-/,
    /^reblogged_/,
    /^featured-post-seen:/,
    /^promoted-post-seen:/,
    /_previous_owner_authority_last_valid_time$/
  ];

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
}

export function isAlreadyMigrated(): boolean {
  return localStorage.getItem(MIGRATION_FLAG_KEY) === '1';
}

export function markMigrated(): void {
  localStorage.setItem(MIGRATION_FLAG_KEY, '1');
}

/**
 * LocalStorage utilities with TTL (Time To Live) support.
 *
 * This module provides a standardized way to store data in localStorage
 * with automatic expiration. All temporary data should use these utilities
 * to prevent localStorage from growing indefinitely.
 *
 * @module storage-with-ttl
 */

/* eslint-disable no-restricted-properties -- This is the core storage utility that needs direct localStorage access */

import { getLogger } from './logging';

const logger = getLogger('storage');

/**
 * Default TTL values for different data types (in milliseconds)
 */
export const StorageTTL = {
  /** Draft posts/comments - 30 days */
  DRAFT: 30 * 24 * 60 * 60 * 1000,
  /** UI state (reply boxes, etc.) - 30 days */
  UI_STATE: 30 * 24 * 60 * 60 * 1000,
  /** Cached API data - 1 hour */
  CACHE: 60 * 60 * 1000,
  /** Session data - 7 days */
  SESSION: 7 * 24 * 60 * 60 * 1000,
  /** Sensitive data (WIF keys) - 24 hours */
  SENSITIVE: 24 * 60 * 60 * 1000,
  /** No expiration (user preferences, settings) */
  PERMANENT: null
} as const;

/**
 * Storage prefixes for different data types.
 * Used for cleanup and organization.
 */
export const StoragePrefix = {
  DRAFT_COMMENT: 'replyTo-',
  DRAFT_EDIT: 'editDraft-',
  DRAFT_POST: 'postData-',
  UI_STATE_REPLY: 'replybox-',
  UI_STATE_EDIT: 'editbox-',
  USER_PREF: 'user-preferences-',
  VOTES: 'votesValues',
  TEMPLATES: 'hivePostTemplates-',
  SUGGESTIONS: 'showSuggestions-'
} as const;

interface StorageItem<T> {
  value: T;
  expiresAt: number | null;
  createdAt: number;
}

/**
 * Checks if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves a value to localStorage with optional TTL.
 *
 * @param key - Storage key
 * @param value - Value to store
 * @param ttl - Time to live in milliseconds, or null for permanent storage
 *
 * @example
 * // Store a draft comment for 30 days
 * setStorageItem('replyTo-/user/post-username', 'draft text', StorageTTL.DRAFT);
 *
 * // Store user preferences permanently
 * setStorageItem('user-preferences-alice', { theme: 'dark' }, StorageTTL.PERMANENT);
 */
export function setStorageItem<T>(key: string, value: T, ttl: number | null = StorageTTL.DRAFT): void {
  if (!isLocalStorageAvailable() || !key) return;

  const item: StorageItem<T> = {
    value,
    expiresAt: ttl !== null ? Date.now() + ttl : null,
    createdAt: Date.now()
  };

  try {
    window.localStorage.setItem(key, JSON.stringify(item));
  } catch (error) {
    logger.error(error, 'Failed to save to localStorage');
    // If storage is full, try to cleanup expired items
    cleanupExpiredItems();
    try {
      window.localStorage.setItem(key, JSON.stringify(item));
    } catch {
      logger.error('localStorage is full even after cleanup');
    }
  }
}

/**
 * Determines the appropriate TTL for a key based on its prefix.
 * Used for migrating legacy data.
 */
function getTTLForKey(key: string): number | null {
  if (
    key.startsWith(StoragePrefix.DRAFT_COMMENT) ||
    key.startsWith(StoragePrefix.DRAFT_EDIT) ||
    key.startsWith(StoragePrefix.DRAFT_POST)
  ) {
    return StorageTTL.DRAFT;
  }
  if (key.startsWith(StoragePrefix.UI_STATE_REPLY) || key.startsWith(StoragePrefix.UI_STATE_EDIT)) {
    return StorageTTL.UI_STATE;
  }
  // User preferences, votes, templates, suggestions are permanent
  return StorageTTL.PERMANENT;
}

/**
 * Retrieves a value from localStorage, returning null if expired or not found.
 * Handles legacy data formats without modifying storage (migration is done in cleanup).
 *
 * @param key - Storage key
 * @returns The stored value or null if not found/expired
 *
 * @example
 * const draft = getStorageItem<string>('replyTo-/user/post-username');
 * if (draft) {
 *   // Use the draft
 * }
 */
export function getStorageItem<T>(key: string): T | null {
  if (!isLocalStorageAvailable() || !key) return null;

  const stored = window.localStorage.getItem(key);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);

    // Handle legacy format (items without TTL structure)
    // Note: Migration to new format happens in cleanupExpiredItems() to avoid side-effects during reads
    if (!('expiresAt' in parsed) || !('createdAt' in parsed)) {
      // Handle old reply-textbox format: { text, expiresAt }
      if ('text' in parsed && 'expiresAt' in parsed && typeof parsed.text === 'string') {
        // Check if already expired
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          return null;
        }
        return parsed.text as T;
      }

      // Handle old comment-list-item format: { expiresAt } (boolean true implied)
      if ('expiresAt' in parsed && Object.keys(parsed).length === 1) {
        // Check if already expired
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          return null;
        }
        return true as T;
      }

      // Other legacy data - return as-is
      return parsed as T;
    }

    const item = parsed as StorageItem<T>;

    // Check expiration
    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      return null;
    }

    return item.value;
  } catch {
    // Invalid JSON
    return null;
  }
}

/**
 * Removes an item from localStorage.
 *
 * @param key - Storage key to remove
 */
export function removeStorageItem(key: string): void {
  if (!isLocalStorageAvailable() || !key) return;
  window.localStorage.removeItem(key);
}

/**
 * Updates the TTL of an existing item without changing its value.
 * Note: This function removes expired items from storage before refreshing.
 *
 * @param key - Storage key
 * @param ttl - New TTL in milliseconds
 * @returns true if item was updated, false if not found or expired
 */
export function refreshStorageTTL(key: string, ttl: number): boolean {
  if (!isLocalStorageAvailable() || !key) return false;

  const value = getStorageItem(key);
  if (value === null) {
    // Item doesn't exist or is expired - clean it up if it exists in storage
    // (getStorageItem returns null for expired items but doesn't remove them)
    const stored = window.localStorage.getItem(key);
    if (stored) {
      window.localStorage.removeItem(key);
    }
    return false;
  }

  setStorageItem(key, value, ttl);
  return true;
}

/**
 * Cleans up all expired items from localStorage and migrates legacy data.
 * Should be called periodically (e.g., on app startup, visibility change).
 *
 * @returns Number of items cleaned up
 */
export function cleanupExpiredItems(): number {
  if (!isLocalStorageAvailable()) return 0;

  const keysToRemove: string[] = [];
  const keysToMigrate: Array<{ key: string; value: unknown; ttl: number | null }> = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;

    const stored = window.localStorage.getItem(key);
    if (!stored) continue;

    try {
      const parsed = JSON.parse(stored);

      // Check if it's our TTL format
      if ('expiresAt' in parsed && 'createdAt' in parsed) {
        const item = parsed as StorageItem<unknown>;
        if (item.expiresAt !== null && Date.now() > item.expiresAt) {
          keysToRemove.push(key);
        }
      } else {
        // Legacy format - check if it's one of our known prefixes and needs migration
        const isOurKey = Object.values(StoragePrefix).some((prefix) => key.startsWith(prefix));
        if (isOurKey) {
          const ttl = getTTLForKey(key);

          // Handle old reply-textbox format: { text, expiresAt }
          if ('text' in parsed && 'expiresAt' in parsed && typeof parsed.text === 'string') {
            if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
              keysToRemove.push(key);
            } else {
              keysToMigrate.push({ key, value: parsed.text, ttl });
            }
          }
          // Handle old comment-list-item format: { expiresAt }
          else if ('expiresAt' in parsed && Object.keys(parsed).length === 1) {
            if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
              keysToRemove.push(key);
            } else {
              keysToMigrate.push({ key, value: true, ttl });
            }
          }
          // Other legacy data
          else {
            keysToMigrate.push({ key, value: parsed, ttl });
          }
        }
      }
    } catch {
      // Invalid JSON - could be from other sources, leave it alone
    }
  }

  // Remove expired items
  keysToRemove.forEach((key) => window.localStorage.removeItem(key));

  // Migrate legacy items to new format
  keysToMigrate.forEach(({ key, value, ttl }) => {
    setStorageItem(key, value, ttl);
  });

  const totalCleaned = keysToRemove.length;
  const totalMigrated = keysToMigrate.length;

  if (totalCleaned > 0 || totalMigrated > 0) {
    logger.info('Storage cleanup: removed %d expired, migrated %d legacy items', totalCleaned, totalMigrated);
  }

  return totalCleaned;
}

/**
 * Removes all items matching a specific prefix.
 * Note: This removes ALL matching items regardless of expiration status.
 * Useful for clearing user-specific data (e.g., on logout).
 *
 * @param prefix - Key prefix to match
 * @returns Number of items removed
 *
 * @example
 * // Remove all draft posts for a user
 * removeByPrefix('postData-new-alice');
 */
export function removeByPrefix(prefix: string): number {
  if (!isLocalStorageAvailable()) return 0;

  const keysToRemove: string[] = [];

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  return keysToRemove.length;
}

/**
 * Gets storage statistics for debugging/monitoring.
 *
 * @returns Object with storage statistics
 */
export function getStorageStats(): {
  totalItems: number;
  expiredItems: number;
  itemsByPrefix: Record<string, number>;
  estimatedSize: number;
} {
  if (!isLocalStorageAvailable()) {
    return { totalItems: 0, expiredItems: 0, itemsByPrefix: {}, estimatedSize: 0 };
  }

  let expiredItems = 0;
  let estimatedSize = 0;
  const itemsByPrefix: Record<string, number> = {};

  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key) continue;

    const value = window.localStorage.getItem(key);
    if (!value) continue;

    estimatedSize += key.length + value.length;

    // Count by prefix
    const prefix = Object.values(StoragePrefix).find((p) => key.startsWith(p)) ?? 'other';
    itemsByPrefix[prefix] = (itemsByPrefix[prefix] ?? 0) + 1;

    // Check if expired
    try {
      const parsed = JSON.parse(value);
      if ('expiresAt' in parsed && parsed.expiresAt !== null && Date.now() > parsed.expiresAt) {
        expiredItems++;
      }
    } catch {
      // Not our format
    }
  }

  return {
    totalItems: window.localStorage.length,
    expiredItems,
    itemsByPrefix,
    estimatedSize: estimatedSize * 2 // UTF-16 characters = 2 bytes each
  };
}

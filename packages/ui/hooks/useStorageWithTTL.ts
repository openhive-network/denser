'use client';

/**
 * React hook for localStorage with TTL (Time To Live) support.
 *
 * Features:
 * - Automatic expiration checking
 * - Cross-tab synchronization via storage events
 * - SSR-safe (no hydration mismatch)
 * - Legacy data migration
 *
 * @module useStorageWithTTL
 */

/* eslint-disable no-restricted-properties -- This hook needs direct localStorage access for StorageEvent */

import { useCallback, useRef, useSyncExternalStore } from 'react';
import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  StorageTTL
} from '@ui/lib/storage-with-ttl';

type SetValue<T> = T | ((prevValue: T) => T);

// No-op function for disabled hooks
const noop = () => {};

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * React hook for localStorage with TTL support.
 *
 * IMPORTANT: The initialValue should be a stable reference (defined outside component
 * or wrapped in useMemo) to avoid unnecessary re-renders when using object values.
 *
 * @param key - Storage key (empty string disables the hook)
 * @param initialValue - Default value if key doesn't exist. Should be stable reference for objects.
 * @param ttl - Time to live in milliseconds. Use null for permanent storage.
 * @returns Tuple of [value, setValue, removeValue]
 *
 * @example
 * // Store draft with 30-day TTL
 * const [draft, setDraft, removeDraft] = useStorageWithTTL(
 *   'replyTo-/user/post',
 *   '',
 *   StorageTTL.DRAFT
 * );
 *
 * @example
 * // Store preferences permanently - use stable initial value
 * const DEFAULT_PREFS = { theme: 'light' }; // defined outside component
 * const [prefs, setPrefs] = useStorageWithTTL(
 *   'user-preferences-alice',
 *   DEFAULT_PREFS,
 *   StorageTTL.PERMANENT
 * );
 */
export function useStorageWithTTL<T>(
  key: string,
  initialValue: T,
  ttl: number | null = StorageTTL.DRAFT
): [T, (value: SetValue<T>) => void, () => void] {
  // Store initial value in ref - only capture on first render to maintain stable reference
  // This is critical for object initialValues to prevent infinite re-renders
  const initialValueRef = useRef<T>(initialValue);
  // Note: We intentionally do NOT update initialValueRef.current on every render
  // to maintain referential stability for useSyncExternalStore

  // Store TTL in ref to avoid dependency issues
  const ttlRef = useRef(ttl);
  ttlRef.current = ttl;

  // Cache for getSnapshot to ensure referential equality for objects
  // This prevents infinite re-renders when storing objects
  const cachedValueRef = useRef<{ json: string; value: T } | null>(null);

  // If key is empty, hook is disabled - return no-ops immediately
  // This handles the case when username is undefined
  const isDisabled = !key;

  // Read value from localStorage (client-side only)
  // Uses caching to ensure referential equality for object values
  const getSnapshot = useCallback((): T => {
    if (isDisabled || !isBrowser()) {
      return initialValueRef.current;
    }

    // Get raw JSON from localStorage to compare
    const rawJson = window.localStorage.getItem(key);

    // If no value in storage, return initial value (stable reference)
    if (!rawJson) {
      return initialValueRef.current;
    }

    // Check if cached value is still valid (same JSON string)
    if (cachedValueRef.current && cachedValueRef.current.json === rawJson) {
      return cachedValueRef.current.value;
    }

    // Parse and cache the new value
    const item = getStorageItem<T>(key);
    const value = item !== null ? item : initialValueRef.current;

    // Cache the result with the raw JSON for comparison
    cachedValueRef.current = { json: rawJson, value };

    return value;
  }, [key, isDisabled]);

  // Server snapshot always returns initial value (SSR-safe)
  // Must return stable reference to avoid hydration issues
  const getServerSnapshot = useCallback((): T => {
    return initialValueRef.current;
  }, []);

  // Subscribe to storage changes for cross-tab sync
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (isDisabled || !isBrowser()) {
        return noop;
      }

      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === key) {
          onStoreChange();
        }
      };

      // Listen for changes from other tabs
      window.addEventListener('storage', handleStorageChange);

      // Also listen for visibility changes to refresh data
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          onStoreChange();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // CRITICAL: Trigger immediate check after subscription
      // This handles the case where key changes from empty to non-empty after hydration
      // (e.g., when user.isLoggedIn becomes true after SSR)
      // Without this, useSyncExternalStore won't re-check localStorage
      // Use microtask to avoid calling during render
      queueMicrotask(() => {
        onStoreChange();
      });

      return () => {
        window.removeEventListener('storage', handleStorageChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    },
    [key, isDisabled]
  );

  // Use useSyncExternalStore for proper SSR support and cross-tab sync
  const storedValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Memoized setter - writes to storage outside of React's render cycle
  // Note: We check key directly (not isDisabled) to handle dynamic key changes
  const setValue = useCallback(
    (value: SetValue<T>) => {
      if (!key || !isBrowser()) return;

      // Get current value for functional updates
      const currentValue = getStorageItem<T>(key) ?? initialValueRef.current;
      const newValue = value instanceof Function ? value(currentValue) : value;

      // Get old value for StorageEvent
      const oldValue = window.localStorage.getItem(key);

      // Write to storage (this will trigger storage event for other tabs)
      // Note: setStorageItem already handles errors internally
      setStorageItem(key, newValue, ttlRef.current);

      // Dispatch custom event to notify same-tab listeners with full context
      window.dispatchEvent(
        new StorageEvent('storage', {
          key,
          newValue: window.localStorage.getItem(key),
          oldValue,
          storageArea: window.localStorage
        })
      );
    },
    [key]
  );

  // Memoized remover
  // Note: We check key directly (not isDisabled) to handle dynamic key changes
  const removeValue = useCallback(() => {
    if (!key || !isBrowser()) return;

    // Get old value for StorageEvent
    const oldValue = window.localStorage.getItem(key);

    removeStorageItem(key);

    // Dispatch event to notify listeners with full context
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        newValue: null,
        oldValue,
        storageArea: window.localStorage
      })
    );
  }, [key]);

  // When disabled, return initial value but still return the real functions
  // (they will no-op internally when key is empty)
  // This ensures consistent hook behavior across renders when key changes
  return [isDisabled ? initialValueRef.current : storedValue, setValue, removeValue];
}

// Note: StorageTTL is re-exported from @ui/lib/storage-with-ttl via the main index
// Import it from there or from '@ui/components' for use alongside this hook

'use client';

import { useEffect } from 'react';
import { cleanupExpiredItems, getStorageStats } from '@ui/lib/storage-with-ttl';
import { getLogger } from '@ui/lib/logging';

const logger = getLogger('storage');

/**
 * Component that cleans up expired localStorage items.
 * Runs on:
 * - Initial mount
 * - When the tab becomes visible again (visibility change)
 *
 * This ensures that expired data is cleaned even if the user keeps
 * the tab open for extended periods.
 *
 * Should be placed in the root layout of the application.
 *
 * @example
 * // In app/layout.tsx or similar
 * <StorageCleanup />
 */
export function StorageCleanup(): null {
  useEffect(() => {
    // Run cleanup on mount
    runCleanup();

    // Also run cleanup when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runCleanup();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}

function runCleanup(): void {
  const cleaned = cleanupExpiredItems();

  // Log stats in development
  if (process.env.NODE_ENV === 'development' && cleaned > 0) {
    const stats = getStorageStats();
    logger.debug('Storage cleanup completed: %o', {
      cleaned,
      remaining: stats.totalItems,
      byPrefix: stats.itemsByPrefix
    });
  }
}

export default StorageCleanup;

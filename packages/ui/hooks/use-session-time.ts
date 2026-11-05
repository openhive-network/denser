'use client';

import { configuredSessionTime } from '@hive/ui/config/public-vars';
import { resolveChosenSessionTime } from '@hive/ui/lib/session-time';
import { SESSION_TIME_CHOICE_KEY } from '@hive/ui/lib/session-time-choice';
import { StorageTTL } from '@hive/ui/lib/storage-with-ttl';
import { useStorageWithTTL } from '@hive/ui/hooks/useStorageWithTTL';

/**
 * The idle time, in seconds, after which a safe-storage session locks, as `getSessionTime` resolves
 * it; follows the user's choice in this and other tabs.
 */
export function useSessionTime(): number {
  const [chosen] = useStorageWithTTL<unknown>(SESSION_TIME_CHOICE_KEY, null, StorageTTL.PERMANENT);
  return resolveChosenSessionTime(configuredSessionTime, chosen);
}

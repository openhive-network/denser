'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { getUserAvatarUrl } from '@hive/ui/lib/avatar-utils';
import { readAvatarVersion, subscribeAvatarVersions } from '@hive/ui/lib/avatar-version';

const getServerVersion = () => undefined;

/**
 * The avatar version recorded for `username` in this session. Undefined on the server and
 * while hydrating, so server HTML and the first client render agree.
 */
export function useAvatarVersion(username: string): number | undefined {
  const getVersion = useCallback(() => readAvatarVersion(username), [username]);
  return useSyncExternalStore(subscribeAvatarVersions, getVersion, getServerVersion);
}

/**
 * `getUserAvatarUrl` with the session's avatar version for `username`, for places that show
 * the user's own avatar right after they change it (header, account switcher, profile).
 */
export function useUserAvatarUrl(username: string, size: 'small' | 'medium' | 'large' = 'small'): string {
  return getUserAvatarUrl(username, size, useAvatarVersion(username));
}

'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import {
  getUnlockedSafeStorageUsers,
  subscribeSafeStorageLock
} from '@hive/common-hiveio-packages/safe-storage-lock';
import { toast } from '@ui/components/hooks/use-toast';
import { useSharedTranslation } from '@ui/lib/i18n-client';
import { SMART_SIGNER_NAMESPACE } from '@smart-signer/lib/i18n';
import { LoginType, type User } from '@smart-signer/types/common';

/** `unknown` while this page has not started the safe-storage worker, i.e. has not signed with it */
export type SafeStorageLockState = 'unknown' | 'locked' | 'unlocked';

const subscribeNothing = () => () => {};
const getServerSnapshot = () => undefined;

const isSafeStorageUser = (user: User): boolean => user.isLoggedIn && user.loginType === LoginType.hbauth;

/** Whether the safe-storage keys of `user` are locked in this page's worker; `unknown` for another sign-in method. */
export function useSafeStorageLockState(user: User): SafeStorageLockState {
  const unlocked = useSyncExternalStore(
    isSafeStorageUser(user) ? subscribeSafeStorageLock : subscribeNothing,
    getUnlockedSafeStorageUsers,
    getServerSnapshot
  );
  if (!isSafeStorageUser(user) || !unlocked) return 'unknown';
  return unlocked.has(user.username) ? 'unlocked' : 'locked';
}

/**
 * Shows a notice when the safe-storage keys of `user` lock while signed in, as after the idle time:
 * otherwise only the next signature, asking for the password, would tell.
 */
export function useSafeStorageLockNotice(user: User): void {
  // Mounted with the account menu, before anything else may need this namespace: don't suspend
  const { t } = useSharedTranslation(SMART_SIGNER_NAMESPACE, { useSuspense: false });
  const state = useSafeStorageLockState(user);
  const previous = useRef<{ username: string; state: SafeStorageLockState } | null>(null);

  useEffect(() => {
    const last = previous.current;
    previous.current = { username: user.username, state };
    if (last?.username !== user.username || last.state !== 'unlocked' || state !== 'locked') return;
    toast({
      title: t('session_time.locked'),
      description: t('session_time.locked_notice')
    });
  }, [state, t, user.username]);
}

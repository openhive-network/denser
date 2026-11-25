'use client';

import { useEffect, useRef } from 'react';
import { API_SETS_COOKIE, API_SETS_STORAGE_KEY } from '@ui/config/api-set-ids';
import { toastApiSetSwitches, type IApiSetSwitchText } from '@ui/lib/api-set-switch-toast';

/** localStorage keys of the node picks made before API sets existed (see `migrateApiSetsSelection`). */
const LEGACY_CHOICE_KEYS = ['node-endpoint', 'ai-search-endpoint'];

// Checked before the migration's code is loaded: most visitors have nothing to migrate.
const hasChoicesToMigrate = (): boolean =>
  window.localStorage.getItem(API_SETS_STORAGE_KEY) === null &&
  LEGACY_CHOICE_KEYS.some((key) => window.localStorage.getItem(key) !== null);

const migrateStoredChoices = async (): Promise<void> => {
  const [{ getBrowserApiSetsConfig }, { migrateApiSetsSelection }] = await Promise.all([
    import('@ui/config/browser-api-sets'),
    import('@ui/lib/api-sets-storage')
  ]);
  migrateApiSetsSelection(getBrowserApiSetsConfig().nodes);
};

/** Expires the cookie that carried the choices to the server, at the path it was written for. */
const expireApiSetsCookie = (): void => {
  if (!document.cookie.split(';').some((part) => part.trim().startsWith(`${API_SETS_COOKIE}=`))) return;
  const path = process.env.NEXT_PUBLIC_BASE_PATH || '/';
  document.cookie = `${API_SETS_COOKIE}=; path=${path}; max-age=0; samesite=lax`;
};

/**
 * The app-wide part of per-set node choices: stores the node picks made before API sets existed as
 * per-set choices once (see `migrateApiSetsSelection`), expires the retired API sets cookie, and
 * tells the user, in the app's translated `text`, when a call left the node they chose for a set
 * because it failed.
 */
export function useApiSetsEffects(text: IApiSetSwitchText): void {
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    expireApiSetsCookie();
    if (hasChoicesToMigrate()) void migrateStoredChoices();
    return toastApiSetSwitches(() => textRef.current);
  }, []);
}

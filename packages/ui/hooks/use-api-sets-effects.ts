'use client';

import { useEffect, useRef } from 'react';
import { API_SETS_COOKIE, API_SETS_STORAGE_KEY } from '@ui/config/api-set-ids';
import { toastApiSetSwitches, type IApiSetSwitchText } from '@ui/lib/api-set-switch-toast';

/** localStorage keys of node choices that `migrateApiSetsSelection` brings to the cookie. */
const STORED_CHOICE_KEYS = ['node-endpoint', 'ai-search-endpoint', API_SETS_STORAGE_KEY];

// Checked before the migration's code is loaded: most visitors have nothing to migrate.
const hasChoicesToMigrate = (): boolean =>
  !document.cookie.includes(`${API_SETS_COOKIE}=`) &&
  STORED_CHOICE_KEYS.some((key) => window.localStorage.getItem(key) !== null);

const migrateStoredChoices = async (): Promise<void> => {
  const [{ getBrowserApiSetsConfig }, { migrateApiSetsSelection }] = await Promise.all([
    import('@ui/config/browser-api-sets'),
    import('@ui/lib/api-sets-storage')
  ]);
  migrateApiSetsSelection(getBrowserApiSetsConfig().nodes);
};

/**
 * The app-wide part of per-set node choices: brings the stored choices to the server's cookie once
 * (see `migrateApiSetsSelection`), and tells the user, in the app's translated `text`, when a call
 * left the node they chose for a set because it failed.
 */
export function useApiSetsEffects(text: IApiSetSwitchText): void {
  const textRef = useRef(text);
  textRef.current = text;

  useEffect(() => {
    if (hasChoicesToMigrate()) void migrateStoredChoices();
    return toastApiSetSwitches(() => textRef.current);
  }, []);
}

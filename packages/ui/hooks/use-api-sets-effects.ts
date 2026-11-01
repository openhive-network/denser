'use client';

import { useEffect, useRef } from 'react';
import { onApiNodeSwitch } from '@transaction/lib/api-node-switch';
import { API_SETS_COOKIE, API_SETS_STORAGE_KEY } from '@ui/config/api-set-ids';
import { toast } from '@ui/components/hooks/use-toast';

/** A switch away from the node the user chose for an API set, to describe to them. */
export interface IApiSetSwitch {
  node: string;
  selected: string;
  setTitle: string;
}

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
 * (see `migrateApiSetsSelection`), and tells the user, with the text `describe` gives, when a call
 * left the node they chose for a set because it failed.
 */
export function useApiSetsEffects(describe: (switched: IApiSetSwitch) => string): void {
  const describeRef = useRef(describe);
  describeRef.current = describe;

  useEffect(() => {
    if (hasChoicesToMigrate()) void migrateStoredChoices();
    return onApiNodeSwitch((node, detail) => {
      if (!detail) return;
      void import('@ui/config/api-sets').then(({ API_SET_TITLES }) => {
        const switched = { node, selected: detail.selected, setTitle: API_SET_TITLES[detail.setId] };
        toast({ description: describeRef.current(switched) });
      });
    });
  }, []);
}

import { API_SETS_STORAGE_KEY, type TApiSetId } from '@ui/config/api-set-ids';
import { apiSetChoicesOf } from '@ui/config/api-sets';
import { getStorageItem } from '@ui/lib/storage-with-ttl';

/** The browser's stored per-set choices (`ApiSetEngine.serialize()`, nodes named by URL), if any. */
export function loadStoredApiSetsSelection(): string | null {
  const state = getStorageItem<unknown>(API_SETS_STORAGE_KEY);
  return typeof state === 'string' ? state : null;
}

/** The node the user chose per set in this browser; empty outside a browser or without choices. */
export function storedApiSetChoices(): Partial<Record<TApiSetId, string>> {
  const state = loadStoredApiSetsSelection();
  return state ? apiSetChoicesOf(state) : {};
}

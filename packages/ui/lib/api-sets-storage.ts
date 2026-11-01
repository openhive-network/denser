import { API_SETS_COOKIE, API_SETS_STORAGE_KEY } from '@ui/config/api-set-ids';
import {
  apiSetsCookieAssignment,
  readCookieValue,
  selectionWithNodeUrls,
  serializeApiSetChoices
} from '@ui/config/api-sets';
import { getStorageItem, setStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';
import { hiveChainService } from '@transaction/lib/hive-chain-service';

const readCookie = (): string | undefined => readCookieValue(document.cookie, API_SETS_COOKIE);

const storeSelection = (state: string): void => {
  document.cookie = apiSetsCookieAssignment(state, process.env.NEXT_PUBLIC_BASE_PATH);
  setStorageItem(API_SETS_STORAGE_KEY, state, StorageTTL.PERMANENT);
};

/**
 * Where the browser's engine over `catalog` keeps the user's per-set choices (the engine's
 * `SelectionStorage`): the cookie the server routes by, and localStorage, naming nodes by URL. A
 * choice made per set replaces the node picks stored before API sets existed.
 */
export const createApiSetsSelectionStorage = (catalog: readonly string[]) => ({
  load: (): string | null => readCookie() ?? getStorageItem<string>(API_SETS_STORAGE_KEY),
  save: (state: string): void => {
    storeSelection(selectionWithNodeUrls(state, catalog));
    hiveChainService.clearLegacyEndpointChoices();
  }
});

/**
 * Brings the stored choices to the server: the selection kept in localStorage back into its cookie
 * when that is gone, or, the first time, the node picks stored before API sets existed
 * (`node-endpoint` for core, bridge and lite, `ai-search-endpoint` for hivesense), as far as they
 * name nodes of `catalog`. The old picks stay, so a node outside the catalog keeps being used first
 * in this browser until the user chooses per set.
 */
export function migrateApiSetsSelection(catalog: readonly string[]): void {
  if (readCookie() !== undefined) return;
  const stored = getStorageItem<string>(API_SETS_STORAGE_KEY);
  if (stored) {
    storeSelection(stored);
    return;
  }
  const { apiNode, aiNode } = hiveChainService.getLegacyEndpointChoices();
  const state = serializeApiSetChoices(
    { core: apiNode, bridge: apiNode, lite: apiNode, hivesense: aiNode },
    catalog
  );
  if (state) storeSelection(state);
}

import { API_SETS_STORAGE_KEY } from '@ui/config/api-set-ids';
import { selectionWithNodeUrls, serializeApiSetChoices } from '@ui/config/api-sets';
import { loadStoredApiSetsSelection } from '@ui/lib/api-sets-choices';
import { setStorageItem, StorageTTL } from '@ui/lib/storage-with-ttl';
import { hiveChainService } from '@transaction/lib/hive-chain-service';

const storeSelection = (state: string): void => {
  setStorageItem(API_SETS_STORAGE_KEY, state, StorageTTL.PERMANENT);
};

/**
 * Where the browser's engine over `catalog` keeps the user's per-set choices (the engine's
 * `SelectionStorage`): localStorage, naming nodes by URL. They route the browser's calls only; the
 * server never sees them. A choice made per set replaces the node picks stored before API sets existed.
 */
export const createApiSetsSelectionStorage = (catalog: readonly string[]) => ({
  load: loadStoredApiSetsSelection,
  save: (state: string): void => {
    storeSelection(selectionWithNodeUrls(state, catalog));
    hiveChainService.clearLegacyEndpointChoices();
  }
});

/**
 * Stores, once, the node picks made before API sets existed (`node-endpoint` for core and bridge,
 * `ai-search-endpoint` for hivesense) as per-set choices, as far as they name nodes of `catalog`;
 * a browser holding per-set choices already keeps them. lite gets none: such a pick predates lite
 * and says nothing about whether the node serves it. The old picks stay, so a node outside the
 * catalog keeps being used first in this browser until the user chooses per set.
 */
export function migrateApiSetsSelection(catalog: readonly string[]): void {
  if (loadStoredApiSetsSelection() !== null) return;
  const { apiNode, aiNode } = hiveChainService.getLegacyEndpointChoices();
  const state = serializeApiSetChoices({ core: apiNode, bridge: apiNode, hivesense: aiNode }, catalog);
  if (state) storeSelection(state);
}

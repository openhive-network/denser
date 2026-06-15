import type { ExtendedNodeApi, ExtendedRestApi } from '@hive/common-hiveio-packages/wax';
import type { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';

export type Chain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

let chain: Promise<Chain> | undefined = undefined;

export const getChain = (): Promise<Chain> => {
  if (chain) return chain;

  // Lazy-import the chain service (pulls @hiveio/wax + workerbee WASM, ~2.4 MB)
  // only on first actual chain access, so pages that merely render fetched data
  // don't ship the WASM in their first-load bundle.
  chain = import('./hive-chain-service')
    .then(({ getHiveChainService }) => getHiveChainService().getHiveChain())
    .then(wrapChainWithLogging)
    .catch((error) => {
      chain = undefined; // Clear cache so next call retries
      throw error;
    });
  return chain;
};

/**
 * Reset the transaction-layer chain cache.
 * Must be called alongside resetChain() from hive-chain-service
 * to ensure WASM error recovery clears both layers.
 */
export const resetTransactionChain = (): void => {
  chain = undefined;
};

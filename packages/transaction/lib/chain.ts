import type { ExtendedNodeApi, ExtendedRestApi } from '@hive/common-hiveio-packages/wax';
import { getHiveChainService } from './hive-chain-service';
import { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';

export type Chain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

let chain: Promise<Chain> | undefined = undefined;

export const getChain = (): Promise<Chain> => {
  if (!chain) {
    chain = getHiveChainService()
      .getHiveChain()
      .then(wrapChainWithLogging)
      .catch((error) => {
        chain = undefined; // Clear cache so next call retries
        throw error;
      });
    return chain;
  }

  // Re-enter hive-chain getChain so the request's api-node cookie is applied
  // onto the shared singleton before callers use it (hive/denser#952).
  return Promise.all([chain, getHiveChainService().getHiveChain()]).then(([wrapped]) => wrapped);
};

/**
 * Reset the transaction-layer chain cache.
 * Must be called alongside resetChain() from hive-chain-service
 * to ensure WASM error recovery clears both layers.
 */
export const resetTransactionChain = (): void => {
  chain = undefined;
};

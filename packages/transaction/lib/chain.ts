import type { ExtendedNodeApi, ExtendedRestApi } from '@hive/common-hiveio-packages/wax';
import { getHiveChainService } from './hive-chain-service';
import { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';
import { perfCollector } from './perf-collector';

export type Chain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

// Enable perf collection when debug mem is active
const isServer = typeof window === 'undefined';
if (isServer && process.env.DENSER_DEBUG_MEM === 'true') {
  perfCollector.enable();
}

let chain: Promise<Chain> | undefined = undefined;

export const getChain = (): Promise<Chain> => {
  if (chain) return chain;

  chain = getHiveChainService().getHiveChain().then(wrapChainWithLogging).catch((error) => {
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

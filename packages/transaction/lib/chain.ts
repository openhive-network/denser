import type { ExtendedNodeApi, ExtendedRestApi } from '@hive/common-hiveio-packages/wax';
import { getHiveChainService } from './hive-chain-service';
import { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';
import { wrapChainWithRetry } from './chain-retry';
import { siteConfig } from '@ui/config/site';

export type Chain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

let chain: Promise<Chain> | undefined = undefined;

export const getChain = (): Promise<Chain> => {
  if (chain) return chain;

  chain = getHiveChainService()
    .getHiveChain()
    .then((rawChain) =>
      wrapChainWithLogging(
        wrapChainWithRetry(rawChain, {
          api: siteConfig.fallbackEndpoints,
          restApi: siteConfig.fallbackEndpoints
        })
      )
    )
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

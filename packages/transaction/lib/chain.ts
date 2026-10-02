import type { ExtendedNodeApi, ExtendedRestApi } from '@hive/common-hiveio-packages/wax';
import { getHiveChainService } from './hive-chain-service';
import { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';
import { parseFallbackNodes, wrapChainWithServerFailover } from './server-failover';

export type Chain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

let chain: Promise<Chain> | undefined = undefined;

const isServer = typeof window === 'undefined';

// Server renders cannot fall back to the browser's node choice, so they fail over across the
// operator-allowed API nodes instead of rendering a page without its data.
const withServerFailover = (baseChain: Chain): Chain =>
  wrapChainWithServerFailover(baseChain, {
    fallbackNodes: parseFallbackNodes(process.env.REACT_APP_ALLOWED_HIVE_API_NODES, [
      process.env.REACT_APP_IMAGES_ENDPOINT
    ]),
    createNodeChain: (node, timeoutMs) =>
      baseChain.extendConfig({
        chainId: baseChain.chainId,
        apiEndpoint: node,
        restApiEndpoint: baseChain.restApi.endpointUrl,
        apiTimeout: timeoutMs
      })
  });

export const getChain = (): Promise<Chain> => {
  if (chain) return chain;

  const hiveChain = getHiveChainService().getHiveChain().then(wrapChainWithLogging);
  chain = (isServer ? hiveChain.then(withServerFailover) : hiveChain).catch((error) => {
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

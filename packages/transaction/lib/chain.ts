import {
  EXTENDED_REST_API_DEFINITION,
  type ExtendedNodeApi,
  type ExtendedRestApi
} from '@hive/common-hiveio-packages/wax';
import { getHiveChainService } from './hive-chain-service';
import { RequestHelper, TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';
import { parseFallbackNodes, wrapChainWithServerFailover } from './server-failover';
import { createReadClient, IReadClient, IReadClientConfig } from './read-client';

export type Chain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

/** The read-only API calls of `Chain`, served without wax's wasm. */
export type ReadChain = IReadClient<Chain['api'], Pick<Chain['restApi'], keyof ExtendedRestApi>>;

let chain: Promise<Chain> | undefined = undefined;
let readChain: ReadChain | undefined = undefined;

const isServer = typeof window === 'undefined';

// Server renders cannot fall back to the browser's node choice, so they fail over across the
// operator-allowed API nodes instead of rendering a page without its data.
const getServerFallbackNodes = (): string[] =>
  parseFallbackNodes(process.env.REACT_APP_ALLOWED_HIVE_API_NODES, [process.env.REACT_APP_IMAGES_ENDPOINT]);

const withServerFailover = (baseChain: Chain): Chain =>
  wrapChainWithServerFailover(baseChain, {
    fallbackNodes: getServerFallbackNodes(),
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

const getReadClientConfig = (): IReadClientConfig => {
  const endpoints = getHiveChainService().getApiEndpoints();
  return {
    chainId: endpoints.chainId,
    apiEndpoint: endpoints.apiEndpoint,
    restApiEndpoint: endpoints.restApiEndpoint,
    timeoutMs: endpoints.apiTimeout,
    jsonRpcEndpoints: endpoints.searchApiEndpoint
      ? { 'search-api.find_text': endpoints.searchApiEndpoint }
      : undefined,
    restEndpoints: { 'hivesense-api': endpoints.aiEndpoint }
  };
};

const createReadChain = (getConfig: () => IReadClientConfig): ReadChain =>
  wrapChainWithLogging(
    createReadClient<ReadChain['api'], ReadChain['restApi']>({
      getConfig,
      transport: new RequestHelper(),
      restApiDefinition: EXTENDED_REST_API_DEFINITION
    })
  );

/**
 * Client for read-only API calls (bridge, database_api, condenser_api, hivesense, ...). Unlike
 * `getChain()` it never loads wax's wasm, so pages an anonymous reader browses stay wasm-free.
 * It follows the same endpoint configuration as the chain, and on the server the same failover.
 * Signing, broadcasting and wasm-only computation still need `getChain()`.
 */
export const getReadChain = (): ReadChain => {
  if (readChain) return readChain;

  const baseReadChain = createReadChain(getReadClientConfig);
  readChain = isServer
    ? wrapChainWithServerFailover(baseReadChain, {
        fallbackNodes: getServerFallbackNodes(),
        createNodeChain: (node, timeoutMs) =>
          createReadChain(() => ({ ...getReadClientConfig(), apiEndpoint: node, timeoutMs }))
      })
    : baseReadChain;
  return readChain;
};

/**
 * Reset the transaction-layer chain cache.
 * Must be called alongside resetChain() from hive-chain-service
 * to ensure WASM error recovery clears both layers.
 */
export const resetTransactionChain = (): void => {
  chain = undefined;
};

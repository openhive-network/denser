import {
  EXTENDED_REST_API_DEFINITION,
  type ExtendedNodeApi,
  type ExtendedRestApi
} from '@hive/common-hiveio-packages/wax';
import { getHiveChainService } from './hive-chain-service';
import type { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';
import { parseFallbackNodes, wrapChainWithServerFailover } from './server-failover';
import { NodeHealth } from './node-health';
import { createReadClient, IReadClient, IReadClientConfig } from './read-client';
import { fetchReadTransport, ReadTransportError } from './read-transport';
import { announceApiNodeSwitch } from './api-node-switch';
import { configuredAllowedApiNodes, configuredImagesEndpoint } from '@ui/config/public-vars';

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

// The browser fails over across the nodes its CSP lets it call.
const getBrowserFallbackNodes = (): string[] =>
  parseFallbackNodes(configuredAllowedApiNodes, [configuredImagesEndpoint]);

const getFallbackNodes = (): string[] => (isServer ? getServerFallbackNodes() : getBrowserFallbackNodes());

// One record for the whole process (or browser tab): once any call finds a node dead, every chain
// skips it.
const nodeHealth = new NodeHealth();

// A call served by another node means the selected one is down: switch every later call to the node
// that answered, for this browser session only, and let failed reads retry on it.
const switchApiNode = (node: string): void => {
  if (getHiveChainService().getApiEndpoints().apiEndpoint === node) return;
  getHiveChainService().setAutoHiveChainEndpoint(node);
  announceApiNodeSwitch(node);
};

const onFailover = isServer ? undefined : switchApiNode;

const withFailover = (baseChain: Chain): Chain =>
  wrapChainWithServerFailover(baseChain, {
    fallbackNodes: getFallbackNodes(),
    health: nodeHealth,
    onFailover,
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
  chain = hiveChain.then(withFailover).catch((error) => {
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
      transport: fetchReadTransport,
      restApiDefinition: EXTENDED_REST_API_DEFINITION
    })
  );

/**
 * Client for read-only API calls (bridge, database_api, condenser_api, hivesense, ...). Unlike
 * `getChain()` it never loads wax's wasm, so pages an anonymous reader browses stay wasm-free.
 * It follows the same endpoint configuration and failover as the chain.
 * Signing, broadcasting and wasm-only computation still need `getChain()`.
 */
export const getReadChain = (): ReadChain => {
  if (readChain) return readChain;

  readChain = wrapChainWithServerFailover(createReadChain(getReadClientConfig), {
    fallbackNodes: getFallbackNodes(),
    health: nodeHealth,
    // The read client fails only with ReadTransportError on transport; checking for it keeps
    // a failing browser read from loading wax.
    isTransportError: (error) => error instanceof ReadTransportError,
    onFailover,
    createNodeChain: (node, timeoutMs) =>
      createReadChain(() => ({ ...getReadClientConfig(), apiEndpoint: node, timeoutMs }))
  });
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

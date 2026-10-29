import {
  EXTENDED_REST_API_DEFINITION,
  type ExtendedNodeApi,
  type ExtendedRestApi
} from '@hive/common-hiveio-packages/wax';
import { getHiveChainService } from './hive-chain-service';
import type { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';
import { parseFallbackNodes, restApiHealthKey, wrapChainWithServerFailover } from './server-failover';
import { NodeHealth } from './node-health';
import { createReadClient, IReadClient, IReadClientConfig } from './read-client';
import { fetchReadTransport, isRestApiUnavailable, ReadTransportError } from './read-transport';
import { announceApiNodeSwitch } from './api-node-switch';
import {
  configuredAllowedApiNodes,
  configuredHivemindRestNodes,
  configuredImagesEndpoint
} from '@ui/config/public-vars';

export type Chain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

/** The read-only API calls of `Chain`, served without wax's wasm. */
export type ReadChain = IReadClient<Chain['api'], Pick<Chain['restApi'], keyof ExtendedRestApi>>;

let chain: Promise<Chain> | undefined = undefined;
let readChain: { fallbackNodes: string; chain: ReadChain } | undefined = undefined;
let hivemindRestChain: { nodes: string; chain: ReadChain } | undefined = undefined;

const isServer = typeof window === 'undefined';

// Server renders cannot fall back to the browser's node choice, so they fail over across the
// operator-allowed API nodes instead of rendering a page without its data.
const getServerFallbackNodes = (): string[] =>
  parseFallbackNodes(process.env.REACT_APP_ALLOWED_HIVE_API_NODES, [process.env.REACT_APP_IMAGES_ENDPOINT]);

// The browser fails over across the operator-allowed API nodes only: the CSP also lets it call the
// node picker's nodes, but not all of them serve the full API.
export const getBrowserFallbackNodes = (): string[] =>
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

// A REST API served by the REST node (only those fail over) moves with it to `node`; one with an
// endpoint of its own stays there.
const readClientConfigOn = (node: string, timeoutMs: number): IReadClientConfig => {
  const config = getReadClientConfig();
  const restEndpoints =
    config.restEndpoints &&
    Object.fromEntries(
      Object.entries(config.restEndpoints).map(([path, endpoint]) => [
        path,
        endpoint === config.restApiEndpoint ? node : endpoint
      ])
    );
  return { ...config, apiEndpoint: node, restApiEndpoint: node, restEndpoints, timeoutMs };
};

/**
 * Client for read-only API calls (bridge, database_api, condenser_api, hivesense, ...). Unlike
 * `getChain()` it never loads wax's wasm, so pages an anonymous reader browses stay wasm-free.
 * It follows the same endpoint configuration and failover as the chain, and fails its REST reads
 * over across the same nodes. It is created again when the allowed API nodes change.
 * Signing, broadcasting and wasm-only computation still need `getChain()`.
 */
export const getReadChain = (): ReadChain => {
  const fallbackNodes = getFallbackNodes();
  const key = fallbackNodes.join(' ');
  if (readChain?.fallbackNodes === key) return readChain.chain;

  const chain = wrapChainWithServerFailover(createReadChain(getReadClientConfig), {
    fallbackNodes,
    health: nodeHealth,
    // The read client fails only with ReadTransportError on transport; checking for it keeps
    // a failing browser read from loading wax.
    isTransportError: (error) => error instanceof ReadTransportError,
    // REST reads (balance-api, hafah-api, hivemind-api) fail over too: not every node serves them.
    isRestApiUnavailable,
    onFailover,
    createNodeChain: (node, timeoutMs) => createReadChain(() => readClientConfigOn(node, timeoutMs))
  });
  readChain = { fallbackNodes: key, chain };
  return chain;
};

export type HivemindRestApi = ReadChain['restApi']['hivemind-api'];

const HIVEMIND_REST_API = 'hivemind-api';

// Read on every call on the server, like its fallback nodes, so the setting needs no rebuild.
const getHivemindRestNodes = (): string[] =>
  parseFallbackNodes(isServer ? process.env.REACT_APP_HIVEMIND_REST_NODES : configuredHivemindRestNodes);

const createHivemindRestChain = (nodes: readonly string[]): ReadChain => {
  const configFor = (node: string, timeoutMs?: number) => (): IReadClientConfig => {
    const config = getReadClientConfig();
    return {
      ...config,
      apiEndpoint: node,
      restApiEndpoint: node,
      restEndpoints: undefined,
      timeoutMs: timeoutMs ?? config.timeoutMs
    };
  };
  return wrapChainWithServerFailover(createReadChain(configFor(nodes[0])), {
    fallbackNodes: nodes.slice(1),
    health: nodeHealth,
    isTransportError: (error) => error instanceof ReadTransportError,
    isRestApiUnavailable,
    createNodeChain: (node, timeoutMs) => createReadChain(configFor(node, timeoutMs))
  });
};

/**
 * The `hivemind-api` REST API of the hivemind REST nodes (`HIVEMIND_REST_NODES`), failing over
 * across them as `getReadChain()` does. `undefined` while none is configured, or while every one
 * is marked down, so that the caller reads over JSON-RPC instead of waiting on dead nodes.
 */
export const getHivemindRestApi = (): HivemindRestApi | undefined => {
  const nodes = getHivemindRestNodes();
  if (nodes.length === 0) return undefined;
  if (nodes.every((node) => nodeHealth.isDown(restApiHealthKey(node, HIVEMIND_REST_API)))) return undefined;
  const key = nodes.join(' ');
  if (hivemindRestChain?.nodes !== key) {
    hivemindRestChain = { nodes: key, chain: createHivemindRestChain(nodes) };
  }
  return hivemindRestChain.chain.restApi[HIVEMIND_REST_API];
};

const nodeReadChains = new Map<string, ReadChain>();

/**
 * Read client of one API node, without failover: for a question about that node itself (such as
 * which APIs it serves), which another node must not answer in its place.
 */
export const getNodeReadChain = (node: string): ReadChain => {
  let nodeChain = nodeReadChains.get(node);
  if (!nodeChain) {
    nodeChain = createReadChain(() => ({ ...getReadClientConfig(), apiEndpoint: node, restApiEndpoint: node }));
    nodeReadChains.set(node, nodeChain);
  }
  return nodeChain;
};

/**
 * Reset the transaction-layer chain cache.
 * Must be called alongside resetChain() from hive-chain-service
 * to ensure WASM error recovery clears both layers.
 */
export const resetTransactionChain = (): void => {
  chain = undefined;
};

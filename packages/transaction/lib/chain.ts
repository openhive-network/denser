import {
  EXTENDED_REST_API_DEFINITION,
  type ExtendedNodeApi,
  type ExtendedRestApi
} from '@hive/common-hiveio-packages/wax';
import { getHiveChainService } from './hive-chain-service';
import type { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';
import { parseFallbackNodes, wrapChainWithServerFailover } from './server-failover';
import { createReadClient, IReadClient, IReadClientConfig } from './read-client';
import { fetchReadTransport } from './read-transport';
import { wrapChainWithRequestApiNode } from './request-api-node';
import { resolvePreferredApiNode } from '@ui/lib/api-node-preference';

export type Chain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

/** The read-only API calls of `Chain`, served without wax's wasm. */
export type ReadChain = IReadClient<Chain['api'], Pick<Chain['restApi'], keyof ExtendedRestApi>>;

// Browser only: one user, one chain. The server never caches a chain in a slot that later
// requests read (see getServerChain).
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

// On the server, hive-chain getChain() returns the shared wax chain or a cached, never-mutated
// view of it for the request's api-node cookie (hive/denser#952). Each of those instances is
// wrapped once (failover chains allocate wasm state) and looked up by identity, so a request
// only ever gets the instance for its own node, and a wasm reset (new instances) drops the old
// wrappers.
let serverChains = new WeakMap<Chain, Chain>();

const getServerChain = (hiveChain: Chain): Chain => {
  let serverChain = serverChains.get(hiveChain);
  if (!serverChain) {
    serverChain = withServerFailover(wrapChainWithLogging(hiveChain));
    serverChains.set(hiveChain, serverChain);
  }
  return serverChain;
};

export const getChain = (): Promise<Chain> => {
  if (isServer) return getHiveChainService().getHiveChain().then(getServerChain);

  if (chain) return chain;

  chain = getHiveChainService().getHiveChain().then(wrapChainWithLogging).catch((error) => {
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

// Server read chain for one JSON-RPC node (`undefined`: the configured default), with failover.
const createServerReadChain = (node?: string): ReadChain => {
  const getConfig = node ? () => ({ ...getReadClientConfig(), apiEndpoint: node }) : getReadClientConfig;
  return wrapChainWithServerFailover(createReadChain(getConfig), {
    fallbackNodes: getServerFallbackNodes(),
    createNodeChain: (failoverNode, timeoutMs) =>
      createReadChain(() => ({ ...getReadClientConfig(), apiEndpoint: failoverNode, timeoutMs }))
  });
};

// Keyed by node only (allowlisted by the cookie reader, so bounded); holds no request state.
const serverReadChainsByNode = new Map<string, ReadChain>();

const getServerReadChainForNode = (node: string): ReadChain => {
  let nodeChain = serverReadChainsByNode.get(node);
  if (!nodeChain) {
    nodeChain = createServerReadChain(node);
    serverReadChainsByNode.set(node, nodeChain);
  }
  return nodeChain;
};

/**
 * Client for read-only API calls (bridge, database_api, condenser_api, hivesense, ...). Unlike
 * `getChain()` it never loads wax's wasm, so pages an anonymous reader browses stay wasm-free.
 * It follows the same endpoint configuration as the chain, and on the server the same failover.
 * On the server each `api` call goes to the current request's api-node cookie node (when it
 * set an allowlisted one), resolved per call; the shared object itself stays on the default.
 * Signing, broadcasting and wasm-only computation still need `getChain()`.
 */
export const getReadChain = (): ReadChain => {
  if (readChain) return readChain;

  readChain = isServer
    ? wrapChainWithRequestApiNode(createServerReadChain(), {
        resolveNode: resolvePreferredApiNode,
        chainForNode: getServerReadChainForNode
      })
    : createReadChain(getReadClientConfig);
  return readChain;
};

/**
 * Reset the transaction-layer chain cache.
 * Must be called alongside resetChain() from hive-chain-service
 * to ensure WASM error recovery clears both layers.
 */
export const resetTransactionChain = (): void => {
  chain = undefined;
  serverChains = new WeakMap();
};

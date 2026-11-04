import {
  EXTENDED_REST_API_DEFINITION,
  type ExtendedNodeApi,
  type ExtendedRestApi
} from '@hive/common-hiveio-packages/wax';
import { getHiveChainService } from './hive-chain-service';
import type { TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { wrapChainWithLogging } from './chain-proxy';
import {
  FAILOVER_ATTEMPT_TIMEOUT_MS,
  parseFallbackNodes,
  restApiHealthKey,
  wrapChainWithServerFailover,
  type IServerFailoverOptions
} from './server-failover';
import { NodeHealth } from './node-health';
import { createReadClient, IReadClient, IReadClientConfig } from './read-client';
import { fetchReadTransport, isRestApiUnavailable, ReadTransportError } from './read-transport';
import { announceApiNodeSwitch } from './api-node-switch';
import { createApiSetRouting } from './api-sets/call-routing';
import type { TApiSetId } from '@ui/config/api-set-ids';
import {
  configuredAllowedApiNodes,
  configuredApiEndpoint,
  configuredHivemindRestNodes,
  configuredImagesEndpoint,
  configuredRestApiEndpoint
} from '@ui/config/public-vars';

export type Chain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

/** The read-only API calls of `Chain`, served without wax's wasm. */
export type ReadChain = IReadClient<Chain['api'], Pick<Chain['restApi'], keyof ExtendedRestApi>>;

let chain: Promise<Chain> | undefined = undefined;

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

// One record for the whole process (or browser tab), per node and API family: once a call finds a
// node failing for its family, every chain skips the node for that family, and for every family
// once it could not connect to the node at all.
const nodeHealth = new NodeHealth();

// A call served by another node means the selected one is down: switch every later call to the node
// that answered, for this browser session only, and let failed reads retry on it.
const switchApiNode = (node: string): void => {
  if (getHiveChainService().getApiEndpoints().apiEndpoint === node) return;
  getHiveChainService().setAutoHiveChainEndpoint(node);
  announceApiNodeSwitch(node);
};

const onFailover = isServer ? undefined : switchApiNode;

const apiSetRouting = createApiSetRouting(
  isServer
    ? undefined
    : {
        endpoints: () => getHiveChainService().getApiEndpoints(),
        configuredApiEndpoint,
        configuredRestEndpoint: configuredRestApiEndpoint ?? configuredApiEndpoint,
        switchApiNode,
        announceSwitch: announceApiNodeSwitch
      }
);

/** The health record and routing a kind of read chain fails over with. */
type TReadFailover = Pick<IServerFailoverOptions<ReadChain>, 'health' | 'routeFor' | 'onFailover'>;

const sharedFailover: TReadFailover = { health: nodeHealth, routeFor: apiSetRouting.routeCall, onFailover };

// A reader's search is a heavy query a node may be slow on while it serves every other call well:
// it keeps a health record of its own and reports nothing to the API sets, so a slow search never
// moves anyone else's calls away from a node. Its record consults the shared one, so a search does
// not spend its attempt on a node every other call already knows is down.
const searchFailover: TReadFailover = {
  health: new NodeHealth({ consults: nodeHealth }),
  routeFor: async (root, path, configured) => {
    const route = await apiSetRouting.routeCall(root, path, configured);
    return route && { nodes: route.nodes, family: route.family };
  }
};

/**
 * Request timeout of one search attempt. Search asks a node once and at most one more node after
 * it (see `withTimeout` of `wrapChainWithServerFailover`), without hedging.
 */
const SEARCH_TIMEOUT_MS = FAILOVER_ATTEMPT_TIMEOUT_MS;

interface ICachedReadChain {
  key: string;
  chain: ReadChain;
}

/** The chain of `failover` cached under `key`, built again once `key` changes. */
const cachedReadChain = (
  cache: Map<TReadFailover, ICachedReadChain>,
  failover: TReadFailover,
  key: string,
  build: () => ReadChain
): ReadChain => {
  const cached = cache.get(failover);
  if (cached?.key === key) return cached.chain;
  const chain = build();
  cache.set(failover, { key, chain });
  return chain;
};

const readChains = new Map<TReadFailover, ICachedReadChain>();
const hivemindRestChains = new Map<TReadFailover, ICachedReadChain>();

const withFailover = (baseChain: Chain): Chain =>
  wrapChainWithServerFailover(baseChain, {
    fallbackNodes: getFallbackNodes(),
    routeFor: apiSetRouting.routeCall,
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

// Every REST API moves to `node`: a call is failed over only to nodes of its own API family.
const readClientConfigOn = (node: string, timeoutMs: number): IReadClientConfig => ({
  ...getReadClientConfig(),
  apiEndpoint: node,
  restApiEndpoint: node,
  restEndpoints: undefined,
  timeoutMs
});

const readChainWith = (failover: TReadFailover): ReadChain => {
  const fallbackNodes = getFallbackNodes();
  return cachedReadChain(readChains, failover, fallbackNodes.join(' '), () =>
    wrapChainWithServerFailover(createReadChain(getReadClientConfig), {
      ...failover,
      fallbackNodes,
      // The read client fails only with ReadTransportError on transport; checking for it keeps
      // a failing browser read from loading wax.
      isTransportError: (error) => error instanceof ReadTransportError,
      // REST reads (balance-api, hafah-api, hivemind-api) fail over too: not every node serves them.
      isRestApiUnavailable,
      createNodeChain: (node, timeoutMs) => createReadChain(() => readClientConfigOn(node, timeoutMs))
    })
  );
};

/**
 * Client for read-only API calls (bridge, database_api, condenser_api, hivesense, ...). Unlike
 * `getChain()` it never loads wax's wasm, so pages an anonymous reader browses stay wasm-free.
 * It follows the same endpoint configuration and failover as the chain, and fails its REST reads
 * over across the same nodes. It is created again when the allowed API nodes change.
 * Signing, broadcasting and wasm-only computation still need `getChain()`.
 */
export const getReadChain = (): ReadChain => readChainWith(sharedFailover);

/**
 * Read client for a reader's search (`search-api.find_text`): it fails over like `getReadChain()`,
 * but asks each node once without hedging and keeps its own health record, so a slow search leaves
 * the nodes every other call uses as they were. It skips the nodes that record or the shared one
 * marks down.
 */
export const getSearchReadChain = (): ReadChain => readChainWith(searchFailover).withTimeout(SEARCH_TIMEOUT_MS);

/**
 * The nodes the JSON-RPC calls of `setId` go to, best first, as `getReadChain()` routes them: for
 * a question to ask of the set's nodes themselves, such as which of them serves lite posts.
 */
export const getApiSetNodes = async (setId: TApiSetId): Promise<string[]> => {
  const { apiEndpoint } = getReadClientConfig();
  const configured = [apiEndpoint, ...getFallbackNodes().filter((node) => node !== apiEndpoint)];
  return apiSetRouting.nodesOf(setId, configured);
};

export type HivemindRestApi = ReadChain['restApi']['hivemind-api'];

const HIVEMIND_REST_API = 'hivemind-api';

// Read on every call on the server, like its fallback nodes, so the setting needs no rebuild.
const getHivemindRestNodes = (): string[] =>
  parseFallbackNodes(isServer ? process.env.REACT_APP_HIVEMIND_REST_NODES : configuredHivemindRestNodes);

const createHivemindRestChain = (nodes: readonly string[], { health, routeFor }: TReadFailover): ReadChain => {
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
    routeFor,
    health,
    isTransportError: (error) => error instanceof ReadTransportError,
    isRestApiUnavailable,
    createNodeChain: (node, timeoutMs) => createReadChain(configFor(node, timeoutMs))
  });
};

const hivemindRestChainWith = (failover: TReadFailover): ReadChain | undefined => {
  const nodes = getHivemindRestNodes();
  if (nodes.length === 0) return undefined;
  if (nodes.every((node) => failover.health.isDown(restApiHealthKey(node, HIVEMIND_REST_API)))) return undefined;
  return cachedReadChain(hivemindRestChains, failover, nodes.join(' '), () =>
    createHivemindRestChain(nodes, failover)
  );
};

/**
 * The `hivemind-api` REST API of the hivemind REST nodes (`HIVEMIND_REST_NODES`), failing over
 * across them as `getReadChain()` does. `undefined` while none is configured, or while every one
 * is marked down, so that the caller reads over JSON-RPC instead of waiting on dead nodes.
 */
export const getHivemindRestApi = (): HivemindRestApi | undefined =>
  hivemindRestChainWith(sharedFailover)?.restApi[HIVEMIND_REST_API];

/** `getHivemindRestApi()` for a reader's search, failing over as `getSearchReadChain()` does. */
export const getSearchHivemindRestApi = (): HivemindRestApi | undefined =>
  hivemindRestChainWith(searchFailover)?.withTimeout(SEARCH_TIMEOUT_MS).restApi[HIVEMIND_REST_API];

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

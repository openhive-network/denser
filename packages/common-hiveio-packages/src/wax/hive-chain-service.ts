import type { IWaxOptionsChain, TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { siteConfig } from '@hive/ui/config/site'; // Maybe move this to package specific only to config
import { configuredAIDomain } from '@hive/ui/config/public-vars';
import { ExtendedNodeApi, ExtendedRestApi } from './extended-hive.chain';
import { EXTENDED_REST_API_DEFINITION } from './rest-api-definition';
import { getLogger } from '@hive/ui/lib/logging';
import { initializeAssetConstants } from '@hive/ui/lib/asset-constants';

export type HiveChain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

const logger = getLogger('wax');

// sessionStorage, not localStorage: an automatic pick must not outlive the browser session, and it
// is kept apart from `node-endpoint`, the user's explicit choice, which it never overwrites.
const AUTO_RPC_ENDPOINT_KEY = 'auto-node-endpoint';

interface IAutoRpcEndpoint {
  /** The configured node (explicit choice or site default) this pick stands in for. */
  replaced: string;
  node: string;
}

const isAutoRpcEndpoint = (value: unknown): value is IAutoRpcEndpoint =>
  typeof value === 'object' &&
  value !== null &&
  'replaced' in value &&
  typeof value.replaced === 'string' &&
  'node' in value &&
  typeof value.node === 'string';

const getSessionStorage = (): Storage | undefined =>
  typeof window === 'object' && window.sessionStorage ? window.sessionStorage : undefined;

/** The node picked automatically this session in place of `configuredNode`, if any. */
const getAutoRpcEndpoint = (configuredNode: string): string | undefined => {
  const stored = getSessionStorage()?.getItem(AUTO_RPC_ENDPOINT_KEY);
  if (!stored) return undefined;
  try {
    const parsed: unknown = JSON.parse(stored);
    // A pick made for another configured node no longer applies once the user chose a node.
    return isAutoRpcEndpoint(parsed) && parsed.replaced === configuredNode ? parsed.node : undefined;
  } catch (err) {
    logger.error('Error parsing stored %s from sessionStorage: %o', AUTO_RPC_ENDPOINT_KEY, err);
    return undefined;
  }
};

const getStoredRpcEndpoint = (): string | undefined => {
  if (typeof window !== 'object' || !window.localStorage) return undefined;
  const stored = window.localStorage.getItem('node-endpoint');
  if (!stored) return undefined;
  try {
    return JSON.parse(stored);
  } catch (err) {
    logger.error('Error parsing stored node-endpoint from localStorage: %o', err);
    return undefined;
  }
};

const getDefaultClientOptions = (): IWaxOptionsChain => {
  // I don't think this logic should be here, but for now it is easier to keep it. We have dedicated MemoryMixin (?)
  // Check if user has selected a custom node in localStorage
  const jsonRpcNode = getStoredRpcEndpoint();
  let restNode: string | undefined = undefined;
  if (typeof window === 'object' && window.localStorage) {
    const storedRestEndpoint = window.localStorage.getItem('rest-node-endpoint');
    if (storedRestEndpoint) {
      try {
        restNode = JSON.parse(storedRestEndpoint);
      } catch (err) {
        logger.error('Error parsing stored rest-node-endpoint from localStorage: %o', err);
      }
    }
  }

  const configuredNode = jsonRpcNode || siteConfig.endpoint;
  const apiEndpoint = getAutoRpcEndpoint(configuredNode) || configuredNode;

  return {
    chainId: siteConfig.chainId,
    apiEndpoint,
    apiTimeout: 5_000, // To be adjusted
    // REST precedence: user's explicit choice, then the operator-configured REST
    // endpoint (REACT_APP_REST_API_ENDPOINT - the JSON-RPC node may not serve the
    // REST APIs at all), then follow the JSON-RPC endpoint.
    restApiEndpoint: restNode || siteConfig.restApiEndpoint || apiEndpoint,
  };
};

const getAIDefaultEndpoint = (): string | undefined => {
  if (typeof window === 'object' && window.localStorage) {
    const storedJsonRpcNode = window.localStorage.getItem('ai-search-endpoint');
    if (storedJsonRpcNode) {
      try {
        return JSON.parse(storedJsonRpcNode);
      } catch (err) {
        logger.error('Error parsing stored ai-search-endpoint from localStorage: %o', err);
      }
    }
  }

  return undefined;
};

// Hivesense has its own default endpoint (REACT_APP_AI_DOMAIN) - it is not
// deployed on every API node; the localStorage override still wins
const resolveAiEndpoint = (restApiEndpoint: string): string =>
  getAIDefaultEndpoint() || configuredAIDomain || restApiEndpoint;

let hiveChainPromise: Promise<HiveChain> | undefined = undefined;
// This should be just a reference retrieved from the hiveChainPromise.
let hiveChain: HiveChain | undefined = undefined;

/**
 * Check if an error is a WASM memory corruption error.
 * These errors indicate the WASM module state is corrupted and needs recreation.
 *
 * WORKAROUND: This is a temporary fix until WAX library handles WASM errors internally.
 * See: https://gitlab.syncad.com/hive/wax/-/issues/161
 */
export const isWasmMemoryError = (error: unknown): boolean => {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('memory access out of bounds') ||
           msg.includes('unreachable') ||
           (error.name === 'RuntimeError' && msg.includes('wasm')) ||
           (error.name === 'WaxError' && msg.includes('wasm'));
  }
  return false;
};

/**
 * Reset the chain singleton to force recreation with fresh WASM state.
 * Call this when WASM memory errors are detected.
 *
 * WORKAROUND: This is a temporary fix until WAX library handles WASM errors internally.
 * See: https://gitlab.syncad.com/hive/wax/-/issues/161
 */
export const resetChain = (): void => {
  logger.warn('Resetting WAX chain singleton due to WASM error - see wax#161');
  hiveChainPromise = undefined;
  hiveChain = undefined;
};

// `endpointUrl` is the chain's default node (what failover and chains extended from it start from);
// `api.endpointUrl` overrides it for the JSON-RPC calls. Both must follow a node switch.
const pointChainAt = (endpoint: string): void => {
  if (!hiveChain) return;
  hiveChain.endpointUrl = endpoint;
  hiveChain.api.endpointUrl = endpoint;
};

// The setters persist the choice even before the chain exists: the wasm-free read client and a
// chain created later both resolve their endpoints from it (see getApiEndpoints).
export const setRpcEndpoint = (newEndpoint: string): void => {
  logger.info('Changing chain.api.endpointUrl with newEndpoint: %o', newEndpoint);

  pointChainAt(newEndpoint);

  window.localStorage.setItem('node-endpoint', JSON.stringify(newEndpoint));
  getSessionStorage()?.removeItem(AUTO_RPC_ENDPOINT_KEY);
};

/**
 * Switches API calls to `newEndpoint` for the rest of the browser session, after the configured
 * node failed. The configured node (the user's explicit choice or the site default) stays stored
 * and is used again by the next session; picking the configured node itself drops the switch.
 */
export const setAutoRpcEndpoint = (newEndpoint: string): void => {
  const configuredNode = getStoredRpcEndpoint() || siteConfig.endpoint;
  logger.warn('Switching API node to %s for this session, replacing %s', newEndpoint, configuredNode);

  pointChainAt(newEndpoint);

  const storage = getSessionStorage();
  if (newEndpoint === configuredNode) {
    storage?.removeItem(AUTO_RPC_ENDPOINT_KEY);
  } else {
    const pick: IAutoRpcEndpoint = { replaced: configuredNode, node: newEndpoint };
    storage?.setItem(AUTO_RPC_ENDPOINT_KEY, JSON.stringify(pick));
  }

  // A REST endpoint that follows the JSON-RPC node follows the switch too.
  if (hiveChain) {
    hiveChain.restApi.endpointUrl = getDefaultClientOptions().restApiEndpoint;
  }
};

export const setRestApiEndpoint = (newEndpoint: string): void => {
  logger.info('Changing chain.restApi.endpointUrl with newEndpoint: %o', newEndpoint);

  if (hiveChain) {
    hiveChain.restApi.endpointUrl = newEndpoint;
  }

  window.localStorage.setItem('rest-node-endpoint', JSON.stringify(newEndpoint));
};

export const setAiEndpoint = (newEndpoint: string): void => {
  logger.info('Changing chain.restApi["hivesense-api"].endpointUrl with newEndpoint: %o', newEndpoint);

  if (hiveChain) {
    hiveChain.restApi['hivesense-api'].endpointUrl = newEndpoint;
    hiveChain.api['search-api'].find_text.endpointUrl = newEndpoint;
  }

  window.localStorage.setItem('ai-search-endpoint', JSON.stringify(newEndpoint));
};

/**
 * Hivesense endpoint the chain uses, or would use once created. Does not create
 * the chain, so it is safe to call during page load (no wasm download).
 */
export const getAiEndpoint = (): string => {
  if (hiveChain) return String(hiveChain.restApi['hivesense-api'].endpointUrl);

  return resolveAiEndpoint(getDefaultClientOptions().restApiEndpoint);
};

export interface IApiEndpoints {
  chainId: string;
  apiEndpoint: string;
  restApiEndpoint: string;
  apiTimeout: number;
  /** Endpoint of the `hivesense-api` REST API. */
  aiEndpoint: string;
  /** Endpoint of the `search-api` JSON-RPC API, when it is not `apiEndpoint`. */
  searchApiEndpoint?: string;
}

/**
 * Endpoints the wax chain is (or would be) configured with. Does not create the chain, so
 * a client that only reads from the API can follow the same node choice without loading wasm.
 */
export const getApiEndpoints = (): IApiEndpoints => {
  const { chainId, apiEndpoint, restApiEndpoint, apiTimeout } = getDefaultClientOptions();

  return {
    chainId,
    apiEndpoint,
    restApiEndpoint,
    apiTimeout,
    aiEndpoint: resolveAiEndpoint(restApiEndpoint),
    searchApiEndpoint: getAIDefaultEndpoint()
  };
};

// This is intentionally non-async method as we don't want any race condition for hiveChainPromise !== undefined check
const setChainClient = (options: Partial<IWaxOptionsChain> = {}): Promise<HiveChain> => {
  const clientOptions = {
    ...getDefaultClientOptions(),
    ...options
  };
  logger.info('Creating instance of Wax Chain with options: %o', clientOptions);

  // wax's JavaScript is loaded with the chain, so pages that never create one do not download it.
  const createChain = async () => (await import('@hiveio/wax')).createHiveChain(clientOptions);

  hiveChainPromise = createChain().then((hiveChainInitialized) => {
    const extended = hiveChainInitialized
      .extend<ExtendedNodeApi>()
      .extendRest<ExtendedRestApi>(EXTENDED_REST_API_DEFINITION);

    hiveChain = extended;

    // Initialize asset constants from wax's chain.ASSETS
    initializeAssetConstants(hiveChain.ASSETS);

    const aiEndpoint = getAIDefaultEndpoint();

    hiveChain.restApi['hivesense-api'].endpointUrl = resolveAiEndpoint(clientOptions.restApiEndpoint);
    if (aiEndpoint) {
      hiveChain.api['search-api'].find_text.endpointUrl = aiEndpoint;
    }

    return hiveChain;
  }).catch((error) => {
    hiveChainPromise = undefined; // Clear cache so next call retries
    hiveChain = undefined;
    throw error;
  });

  return hiveChainPromise;
};

export const initChain = (): Promise<HiveChain> => {
  if (hiveChainPromise)
    return hiveChainPromise;

  return setChainClient();
}

export const reuseHiveChain = (): HiveChain | undefined => {
  return hiveChain;
};

export const getChain = (): Promise<HiveChain> => {
  if (hiveChainPromise)
    return hiveChainPromise;

  return initChain();
};

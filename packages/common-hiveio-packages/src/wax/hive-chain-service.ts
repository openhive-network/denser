import { createHiveChain, IWaxOptionsChain, TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { siteConfig } from '@hive/ui/config/site'; // Maybe move this to package specific only to config
import { configuredAIDomain } from '@hive/ui/config/public-vars';
import { ExtendedNodeApi, ExtendedRestApi } from './extended-hive.chain';
import { getLogger } from '@hive/ui/lib/logging';
import { initializeAssetConstants } from '@hive/ui/lib/asset-constants';
import {
  readPreferredApiNodeFromLocalStorage,
  resolvePreferredApiNode,
  setApiNodeCookie
} from '@hive/ui/lib/api-node-preference';
import { chainForApiNode } from './request-scoped-api-node';

export type HiveChain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

const logger = getLogger('wax');

const getDefaultClientOptions = (): IWaxOptionsChain => {
  // I don't think this logic should be here, but for now it is easier to keep it. We have dedicated MemoryMixin (?)
  let restNode: string | undefined = undefined;
  // Client-only. The SSR api-node cookie must NOT be baked into the process-wide
  // singleton (one visitor's node would stick for every later request).
  const jsonRpcNode = readPreferredApiNodeFromLocalStorage();

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

  return {
    chainId: siteConfig.chainId,
    apiEndpoint: jsonRpcNode || siteConfig.endpoint,
    apiTimeout: 5_000, // To be adjusted
    // REST precedence: user's explicit choice, then the operator-configured REST
    // endpoint (REACT_APP_REST_API_ENDPOINT - the JSON-RPC node may not serve the
    // REST APIs at all), then follow the JSON-RPC endpoint.
    restApiEndpoint: restNode || siteConfig.restApiEndpoint || jsonRpcNode || siteConfig.endpoint,
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

export const setRpcEndpoint = (newEndpoint: string): void => {
  logger.info('Changing chain.api.endpointUrl with newEndpoint: %o', newEndpoint);

  // We should ensure the call flow is correct (init first -> modify next)
  if (!hiveChain) {
    throw new Error('Wax Chain is not initialized yet. Call initChain() first.');
  }

  hiveChain.api.endpointUrl = newEndpoint;

  window.localStorage.setItem('node-endpoint', JSON.stringify(newEndpoint));
  // Mirror into cookie so SSR respects the same node (hive/denser#952).
  setApiNodeCookie(newEndpoint);
};

export const setRestApiEndpoint = (newEndpoint: string): void => {
  logger.info('Changing chain.restApi.endpointUrl with newEndpoint: %o', newEndpoint);

  // We should ensure the call flow is correct (init first -> modify next)
  if (!hiveChain) {
    throw new Error('Wax Chain is not initialized yet. Call initChain() first.');
  }

  hiveChain.restApi.endpointUrl = newEndpoint;
  window.localStorage.setItem('rest-node-endpoint', JSON.stringify(newEndpoint));
};

export const setAiEndpoint = (newEndpoint: string): void => {
  logger.info('Changing chain.restApi["hivesense-api"].endpointUrl with newEndpoint: %o', newEndpoint);

  // We should ensure the call flow is correct (init first -> modify next)
  if (!hiveChain) {
    throw new Error('Wax Chain is not initialized yet. Call initChain() first.');
  }

  // Always use the same endpoint as the main API for hivesense-api
  hiveChain.restApi['hivesense-api'].endpointUrl = newEndpoint;
  hiveChain.api['search-api'].find_text.endpointUrl = newEndpoint;

  window.localStorage.setItem('ai-search-endpoint', JSON.stringify(newEndpoint));
};

// This is intentionally non-async method as we don't want any race condition for hiveChainPromise !== undefined check
const setChainClient = (options: Partial<IWaxOptionsChain> = {}): Promise<HiveChain> => {
  const clientOptions = {
    ...getDefaultClientOptions(),
    ...options
  };
  logger.info('Creating instance of Wax Chain with options: %o', clientOptions);

  hiveChainPromise = createHiveChain(clientOptions).then((hiveChainInitialized) => {
    const extended = hiveChainInitialized.extend<ExtendedNodeApi>().extendRest<ExtendedRestApi>({
      'hivesense-api': {
        posts: {
          urlPath: "posts",
          search: {
            urlPath: "search",
            method: "GET"
          },
          author: {
            urlPath: "{author}",
            permlink: {
              urlPath: "{permlink}",
              similar: {
                urlPath: "similar",
                method: "GET"
              }
            }
          },
          byIds: {
            urlPath: "by-ids",
            method: "POST"
          },
          byIdsQuery: {
            urlPath: "by-ids-query",
            method: "GET"
          }
        },
        authors: {
          urlPath: "authors",
          search: {
            urlPath: "search",
            method: "GET"
          }
        },
      },
      method: "GET",
      'hivemind-api': {
        "accountsOperations": {
          urlPath: 'accounts/{account-name}/operations',
        }
      },
      'hafah-api': {
        'operation-types': {
          urlPath: 'operation-types'
        }
      }
    });

    hiveChain = extended;

    // Initialize asset constants from wax's chain.ASSETS
    initializeAssetConstants(hiveChain.ASSETS);

    const aiEndpoint = getAIDefaultEndpoint();

    // Hivesense has its own default endpoint (REACT_APP_AI_DOMAIN) - it is not
    // deployed on every API node; the localStorage override still wins
    hiveChain.restApi['hivesense-api'].endpointUrl =
      aiEndpoint || configuredAIDomain || clientOptions.restApiEndpoint;
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
  const promise = hiveChainPromise ?? initChain();
  return promise.then((shared) => {
    const server = typeof window === 'undefined';
    // Server: allowlisted api-node cookie. Client: localStorage.
    // Never assign endpointUrl on the server; that mutates the shared wax client.
    const preferred = server ? resolvePreferredApiNode() : readPreferredApiNodeFromLocalStorage();
    if (server && preferred && preferred !== shared.api.endpointUrl) {
      logger.info('Using per-request API node %o (shared client stays %o)', preferred, shared.api.endpointUrl);
    }
    return chainForApiNode(shared, preferred, server);
  });
};

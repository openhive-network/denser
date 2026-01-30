import { createHiveChain, IWaxOptionsChain, TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { siteConfig } from '@hive/ui/config/site'; // Maybe move this to package specific only to config
import { ExtendedNodeApi, ExtendedRestApi } from './extended-hive.chain';
import { getLogger } from '@hive/ui/lib/logging';
import { initializeAssetConstants } from '@hive/ui/lib/asset-constants';
import { getStorageItem, setStorageItem, StorageTTL } from '@hive/ui/lib/storage-with-ttl';

export type HiveChain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

const logger = getLogger('wax');

const getDefaultClientOptions = (): IWaxOptionsChain => {
  // I don't think this logic should be here, but for now it is easier to keep it. We have dedicated MemoryMixin (?)
  let jsonRpcNode: string | undefined = undefined;
  let restNode: string | undefined = undefined;
  // Check if user has selected a custom node in localStorage
  if (typeof window === 'object') {
    const storedJsonRpcEndpoint = getStorageItem<string>('node-endpoint');
    if (storedJsonRpcEndpoint) {
      try {
        jsonRpcNode = JSON.parse(storedJsonRpcEndpoint);
      } catch (err) {
        logger.error({ err }, 'Error parsing stored node-endpoint from localStorage');
      }
    }

    const storedRestEndpoint = getStorageItem<string>('rest-node-endpoint');
    if (storedRestEndpoint) {
      try {
        restNode = JSON.parse(storedRestEndpoint);
      } catch (err) {
        logger.error({ err }, 'Error parsing stored rest-node-endpoint from localStorage');
      }
    }
  }

  return {
    chainId: siteConfig.chainId,
    apiEndpoint: jsonRpcNode || siteConfig.endpoint,
    apiTimeout: 5_000, // To be adjusted
    restApiEndpoint: restNode || jsonRpcNode || siteConfig.endpoint,
  };
};

const getAIDefaultEndpoint = (): string | undefined => {
  if (typeof window === 'object') {
    const storedJsonRpcNode = getStorageItem<string>('ai-search-endpoint');
    if (storedJsonRpcNode) {
      try {
        return JSON.parse(storedJsonRpcNode);
      } catch (err) {
        logger.error({ err }, 'Error parsing stored ai-search-endpoint from localStorage');
      }
    }
  }

  return undefined;
};

let hiveChainPromise: Promise<HiveChain> | undefined = undefined;
// This should be just a reference retrieved from the hiveChainPromise.
let hiveChain: HiveChain | undefined = undefined;

export const setRpcEndpoint = (newEndpoint: string): void => {
  logger.info('Changing chain.api.endpointUrl with newEndpoint: %o', newEndpoint);

  // We should ensure the call flow is correct (init first -> modify next)
  if (!hiveChain) {
    throw new Error('Wax Chain is not initialized yet. Call initChain() first.');
  }

  hiveChain.api.endpointUrl = newEndpoint;

  setStorageItem('node-endpoint', JSON.stringify(newEndpoint), StorageTTL.PERMANENT);
};

export const setRestApiEndpoint = (newEndpoint: string): void => {
  logger.info('Changing chain.restApi.endpointUrl with newEndpoint: %o', newEndpoint);

  // We should ensure the call flow is correct (init first -> modify next)
  if (!hiveChain) {
    throw new Error('Wax Chain is not initialized yet. Call initChain() first.');
  }

  hiveChain.restApi.endpointUrl = newEndpoint;
  setStorageItem('rest-node-endpoint', JSON.stringify(newEndpoint), StorageTTL.PERMANENT);
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

  setStorageItem('ai-search-endpoint', JSON.stringify(newEndpoint), StorageTTL.PERMANENT);
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

    // Always use the same endpoint as the main API for hivesense-api
    hiveChain.restApi['hivesense-api'].endpointUrl = aiEndpoint || clientOptions.restApiEndpoint;
    if (aiEndpoint) {
      hiveChain.api['search-api'].find_text.endpointUrl = aiEndpoint;
    }

    return hiveChain;
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

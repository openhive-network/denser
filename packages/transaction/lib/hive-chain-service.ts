import { createHiveChain, IWaxOptionsChain, TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { siteConfig } from '@ui/config/site';
import { StorageType, StorageBaseOptions } from '@smart-signer/lib/storage-mixin';
import { isStorageAvailable } from '@smart-signer/lib/storage-utils';
import { memoryStorage } from '@smart-signer/lib/memory-storage';
import { getLogger } from '@ui/lib/logging';
import { ExtendedNodeApi, ExtendedRestApi } from './extended-hive.chain';
import { hbauthService } from '@smart-signer/lib/hbauth-service';

const logger = getLogger('app');

export type HiveChain = TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

export class HiveChainService {
  static hiveChain: HiveChain;

  storage: Storage;
  storageType: StorageType;

  /**
   * Pending promise, returning Hbauth OnlineCLient. Intended for
   * awaiting by any requests arrived when it is pending.
   *
   * @type {(Promise<TWaxExtended<ExtendedNodeApi, IHiveChainInterface>> | null)}
   * @memberof HiveChainService
   */
  hiveChainPromise: Promise<HiveChain> | null;

  constructor({ storageType = 'localStorage' }: StorageBaseOptions) {
    this.hiveChainPromise = null;
    this.storageType = storageType;
    if (this.storageType === 'localStorage' && isStorageAvailable(this.storageType, true)) {
      this.storage = window.localStorage;
    } else if (this.storageType === 'sessionStorage' && isStorageAvailable(this.storageType, true)) {
      this.storage = window.sessionStorage;
    } else {
      this.storageType = 'memoryStorage';
      this.storage = memoryStorage;
    }
  }

  async getHiveChain(): Promise<HiveChain> {
    if (!HiveChainService.hiveChain) {
      // If we have pending promise, return its result.
      if (this.hiveChainPromise) return await this.hiveChainPromise;

      // If we haven't pending promise, let's create one.
      const promise = async () => {
        const storedApiEndpoint = this.storage.getItem('node-endpoint');
        let apiEndpoint: string = storedApiEndpoint ? JSON.parse(storedApiEndpoint) : '';
        if (!apiEndpoint) {
          apiEndpoint = siteConfig.endpoint;
        }
        // Set promise result in this class' static property and return
        // it here as well.
        await this.setHiveChain({ apiEndpoint, chainId: siteConfig.chainId });
        return HiveChainService.hiveChain;
      };

      // Set promise to pending.
      this.hiveChainPromise = promise();
      // Return the result of pending promise.
      return await this.hiveChainPromise;
    }
    // If we have not empty existing static property, just return it.
    // logger.info('Returning existing instance of HiveChainService.HiveChain');
    return HiveChainService.hiveChain;
  }

  reuseHiveChain(): HiveChain | undefined{
    if (HiveChainService.hiveChain) return HiveChainService.hiveChain;
    return undefined;
  }

  async setHiveChain(options?: Partial<IWaxOptionsChain>) {
    logger.info('Creating instance of HiveChainService.hiveChain with options: %o', options);
    const hiveChain = await createHiveChain(options);
    HiveChainService.hiveChain = hiveChain.extend<ExtendedNodeApi>().extendRest<ExtendedRestApi>({
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
        urlPath: "hivesense-api/",
      },
      method: "GET",
        'hivemind-api': {
          "accountsOperations": {
            urlPath: 'accounts/{account-name}/operations',
          }
        }
      });
    const storedAiSearchEndpoint = this.storage.getItem('ai-search-endpoint');
    let apiEndpoint: string = storedAiSearchEndpoint ? JSON.parse(storedAiSearchEndpoint) : '';
    if (!apiEndpoint) {
      apiEndpoint = siteConfig.endpoint;
    }
    // Always use the same endpoint as the main API for hivesense-api
    HiveChainService.hiveChain.restApi['hivesense-api'].endpointUrl = options?.apiEndpoint || siteConfig.endpoint;
    if (storedAiSearchEndpoint) {
      HiveChainService.hiveChain.api['search-api'].find_text.endpointUrl = apiEndpoint;
    }
  }

  async setHiveChainEndpoint(newEndpoint: string) {
    logger.info('Changing HiveChainService.HiveChain.endpointUrl with newEndpoint: %o', newEndpoint);
    HiveChainService.hiveChain.endpointUrl = newEndpoint;
    this.storage.setItem('node-endpoint', JSON.stringify(newEndpoint));
    await hbauthService.setOnlineClient({ node: newEndpoint });
  }

  async setAiSearchEndpoint(newEndpoint: string) {
    logger.info('Changing AI search with newEndpoint: %o', newEndpoint);
    HiveChainService.hiveChain.restApi['hivesense-api'].endpointUrl = newEndpoint;
    HiveChainService.hiveChain.api['search-api'].find_text.endpointUrl = newEndpoint;
    this.storage.setItem('ai-search-endpoint', JSON.stringify(newEndpoint));
  }
}

export const hiveChainService = new HiveChainService({ storageType: 'localStorage' });

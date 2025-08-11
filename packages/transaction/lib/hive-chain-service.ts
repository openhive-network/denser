import { createHiveChain, IWaxOptionsChain, TWaxExtended, TWaxRestExtended } from '@hiveio/wax';
import { siteConfig } from '@ui/config/site';
import { StorageType, StorageBaseOptions } from '@smart-signer/lib/storage-mixin';
import { isStorageAvailable } from '@smart-signer/lib/utils';
import { memoryStorage } from '@smart-signer/lib/memory-storage';
import { getLogger } from '@ui/lib/logging';
import { ExtendedNodeApi, ExtendedRestApi } from './extended-hive.chain';
import { hbauthService } from '@smart-signer/lib/hbauth-service';

const logger = getLogger('app');

export class HiveChainService {
  static hiveChain: TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>;

  storage: Storage;
  storageType: StorageType;

  /**
   * Pending promise, returning Hbauth OnlineCLient. Intended for
   * awaiting by any requests arrived when it is pending.
   *
   * @type {(Promise<TWaxExtended<ExtendedNodeApi, IHiveChainInterface>> | null)}
   * @memberof HiveChainService
   */
  hiveChainPromise: Promise<TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>> | null;

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

  async getHiveChain(): Promise<TWaxExtended<ExtendedNodeApi, TWaxRestExtended<ExtendedRestApi>>> {
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

  async setHiveChain(options?: Partial<IWaxOptionsChain>) {
    logger.info('Creating instance of HiveChainService.hiveChain with options: %o', options);
    const hiveChain = await createHiveChain(options);
    HiveChainService.hiveChain = hiveChain.extend<ExtendedNodeApi>().extendRest<ExtendedRestApi>({
      'hivesense-api': {
        urlPath: 'hivesense-api/'
      }
    });
    const storedAiSearchEndpoint = this.storage.getItem('ai-search-endpoint');
    let apiEndpoint: string = storedAiSearchEndpoint ? JSON.parse(storedAiSearchEndpoint) : '';
    if (!apiEndpoint) {
      apiEndpoint = siteConfig.endpoint;
    }
    if (storedAiSearchEndpoint) {
      HiveChainService.hiveChain.restApi['hivesense-api'].endpointUrl = apiEndpoint;
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

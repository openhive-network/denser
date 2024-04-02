import { createHiveChain, IHiveChainInterface, IWaxOptionsChain } from '@hive/wax';
import { siteConfig } from '@ui/config/site';
import { StorageType, StorageBaseOptions } from '@smart-signer/lib/storage-mixin';
import { isStorageAvailable } from '@smart-signer/lib/utils';
import { memoryStorage } from '@smart-signer/lib/memory-storage';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export class HiveChainService {
  static hiveChain: IHiveChainInterface;
  storage: Storage;
  storageType: StorageType;

  constructor({ storageType = 'localStorage' }: StorageBaseOptions) {
    this.storageType = storageType;
    if (this.storageType === 'localStorage'
        && isStorageAvailable(this.storageType, true)
      ) {
      this.storage = window.localStorage;
    } else if (this.storageType === 'sessionStorage'
        && isStorageAvailable(this.storageType, true)
      ) {
      this.storage = window.sessionStorage;
    } else {
      this.storageType = 'memoryStorage';
      this.storage = memoryStorage;
    }
  }

  async getHiveChain(): Promise<IHiveChainInterface> {
    if (!HiveChainService.hiveChain) {
      const storedApiEndpoint = this.storage.getItem('hive-blog-endpoint');
      let apiEndpoint: string = storedApiEndpoint ? JSON.parse(storedApiEndpoint) : '';
      if (!apiEndpoint) {
        apiEndpoint = siteConfig.endpoint;
      }
      await this.setHiveChain({ apiEndpoint });
    }
    // logger.info('Returning existing instance of HiveChainService.HiveChain');
    return HiveChainService.hiveChain;
  }

  async setHiveChain(options?: Partial<IWaxOptionsChain>) {
    logger.info('Creating instance of HiveChainService.HiveChain with options: %o', options);
    HiveChainService.hiveChain = await createHiveChain(options);
  }

  async setHiveChainEndpoint(newEndpoint: string) {
    logger.info('Changing HiveChainService.HiveChain.endpointUrl with newEndpoint: %o', newEndpoint);
    HiveChainService.hiveChain.endpointUrl = newEndpoint;
  }
}

export const hiveChainService = new HiveChainService({ storageType: 'localStorage' });

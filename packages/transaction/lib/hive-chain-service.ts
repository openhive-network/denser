import { createHiveChain, IHiveChainInterface, IWaxOptionsChain } from '@hive/wax';
import { siteConfig } from '@ui/config/site';
import { StorageMixin, StorageBase } from '@smart-signer/lib/storage-mixin';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export class HiveChainService extends StorageMixin(StorageBase) {
  static hiveChain: IHiveChainInterface;

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
}

export const hiveChainService = new HiveChainService({ storageType: 'localStorage' });

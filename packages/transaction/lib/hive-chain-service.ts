import { createHiveChain, IHiveChainInterface, IWaxOptionsChain } from '@hive/wax/web';
import { siteConfig } from '@ui/config/site';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

let apiEndpoint = siteConfig.endpoint;
if (typeof window !== 'undefined') {
  let hiveBlogEndpoint = window.localStorage.getItem('hive-blog-endpoint');
  apiEndpoint = hiveBlogEndpoint ? hiveBlogEndpoint : siteConfig.endpoint;
}

export class HiveChainService {
  static hiveChain: IHiveChainInterface;

  async getHiveChain(): Promise<IHiveChainInterface> {
    if (!HiveChainService.hiveChain) {
      await this.setHiveChain({ apiEndpoint });
    }
    logger.info('Returning existing instance of HiveChain');
    return HiveChainService.hiveChain;
  }

  async setHiveChain(options?: Partial<IWaxOptionsChain>) {
    logger.info('Creating instance of HiveChain with options: %o', options);
    HiveChainService.hiveChain = await createHiveChain(options);
  }
}

export const hiveChainService = new HiveChainService();

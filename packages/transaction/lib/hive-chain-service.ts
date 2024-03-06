import { createHiveChain, IHiveChainInterface, IWaxOptionsChain } from '@hive/wax/web';

import { getLogger } from '@ui/lib/logging';
const logger = getLogger('app');

export class HiveChainService {

  static hiveChain: IHiveChainInterface;

  async getHiveChain(): Promise<IHiveChainInterface> {
    if (!HiveChainService.hiveChain) {
      await this.setHiveChain();
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

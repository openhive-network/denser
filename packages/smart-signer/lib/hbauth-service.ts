import { OnlineClient, ClientOptions } from '@hive/hb-auth';
import { siteConfig } from '@ui/config/site';
import { StorageMixin, StorageBase } from '@smart-signer/lib/storage-mixin';

import { getLogger } from '@hive/ui/lib/logging';
const logger = getLogger('app');

//
// TODO Consider to stop handling these default options here, when
// [#7](https://gitlab.syncad.com/hive/hb-auth/-/issues/7) is resolved.
//
const defaultClientOptions: ClientOptions = {
  sessionTimeout: 900,
  chainId: 'beeab0de00000000000000000000000000000000000000000000000000000000',
  node: 'https://api.hive.blog',
  workerUrl: '/auth/worker.js',
};

const hbauthUseStrictMode = true;

class HbauthService extends StorageMixin(StorageBase) {

  static onlineClient: OnlineClient;

  async getOnlineClient() {
    if (!HbauthService.onlineClient) {
      const storedNode = this.storage.getItem('hive-blog-endpoint');
      let node: string = storedNode ? JSON.parse(storedNode) : '';
      if (!node) {
        node = siteConfig.endpoint;
      }
      await this.setOnlineClient(hbauthUseStrictMode, { node });
    }
    // logger.info('Returning existing instance of HbauthService.onlineClient');
    return HbauthService.onlineClient;
  }

  async setOnlineClient(strict: boolean, options: Partial<ClientOptions>) {
    const clientOptions = {
      ...defaultClientOptions,
      ...options
    };
    logger.info('Creating instance of HbauthService.onlineClient with options: %o', clientOptions);
    HbauthService.onlineClient = await new OnlineClient(strict, clientOptions).initialize();
  }

}

export const hbauthService = new HbauthService({ storageType: 'localStorage' });

import { OnlineClient, ClientOptions } from '@hive/hb-auth';
import { siteConfig } from '@ui/config/site';
import { StorageMixin, StorageBase, StorageBaseOptions } from '@smart-signer/lib/storage-mixin';

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

  /**
   * Pending promise, returning Hbauth OnlineCLient. Intended for
   * awaiting by any requests arrived when it is pending.
   *
   * @type {(Promise<OnlineClient> | null)}
   * @memberof HbauthService
   */
  onlineClientPromise: Promise<OnlineClient> | null;

  constructor(options: StorageBaseOptions) {
    super(options)
    this.onlineClientPromise = null;
  }

  async getOnlineClient(): Promise<OnlineClient> {
    if (!HbauthService.onlineClient) {

      // If we have pending promise return its result.
      if (this.onlineClientPromise) return await this.onlineClientPromise;

      // If we haven't pending promise. let's create one.
      const promise = async () => {
        const storedNode = this.storage.getItem('hive-blog-endpoint');
        let node: string = storedNode ? JSON.parse(storedNode) : '';
        if (!node) {
          node = siteConfig.endpoint;
        }
        // Set promise result in this class' static property and return
        // it here as well.
        await this.setOnlineClient(hbauthUseStrictMode, { node });
        return HbauthService.onlineClient;
      };

      // Set promise to pending.
      this.onlineClientPromise = promise();
      // Return the result of pending promise.
      return await this.onlineClientPromise
    }
    // logger.info('Returning existing instance of HbauthService.onlineClient');
    // If we have not empty existing static property, just return it.
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

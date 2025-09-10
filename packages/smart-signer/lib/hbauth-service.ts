import { OnlineClient, ClientOptions } from '@hiveio/hb-auth';
import { siteConfig } from '@ui/config/site';
import { StorageMixin, StorageBase, StorageBaseOptions } from '@smart-signer/lib/storage-mixin';

import { getLogger } from '@hive/ui/lib/logging';
import { configuredSessionTime } from '@ui/config/public-vars';
import env from '@beam-australia/react-env';

const logger = getLogger('app');

// Get the worker URL with proper basePath handling
const getWorkerUrl = (): string => {
  // Only run in browser context
  if (typeof window === 'undefined') {
    return '/auth/worker.js';
  }
  
  const basePath = env('BASE_PATH') || '';
  
  // For subdirectory deployments, construct the full URL to avoid path issues
  if (basePath) {
    // Use the current origin to construct an absolute URL
    const origin = window.location.origin;
    const workerUrl = `${origin}${basePath}/auth/worker.js`;
    logger.debug('Worker URL (absolute) computed as: %s (basePath: %s)', workerUrl, basePath);
    return workerUrl;
  }

  // For root deployments, use relative path
  const workerUrl = '/auth/worker.js';
  logger.debug('Worker URL (relative) computed as: %s', workerUrl);
  return workerUrl;
};

const defaultClientOptions: ClientOptions = {
  sessionTimeout: Number(configuredSessionTime),
  chainId: 'beeab0de00000000000000000000000000000000000000000000000000000000',
  node: 'https://api.hive.blog',
  workerUrl: '/auth/worker.js' // This will be overridden in getOnlineClient
};

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
    super(options);
    this.onlineClientPromise = null;
  }

  async getOnlineClient(): Promise<OnlineClient> {
    if (!HbauthService.onlineClient) {
      // If we have pending promise, return its result.
      if (this.onlineClientPromise) return await this.onlineClientPromise;

      // If we haven't pending promise. let's create one.
      const promise = async () => {
        const storedNode = this.storage.getItem('node-endpoint');
        let node: string = storedNode ? JSON.parse(storedNode) : '';
        if (!node) {
          node = siteConfig.endpoint;
        }
        // Set promise result in this class' static property and return
        // it here as well.
        await this.setOnlineClient({ 
          node, 
          chainId: siteConfig.chainId,
          workerUrl: getWorkerUrl() // Use dynamic worker URL with basePath
        });
        return HbauthService.onlineClient;
      };

      // Set promise to pending.
      this.onlineClientPromise = promise();
      // Return the result of pending promise.
      return await this.onlineClientPromise;
    }
    // If we have not empty existing static property, just return it.
    // logger.info('Returning existing instance of HbauthService.onlineClient');
    return HbauthService.onlineClient;
  }

  async setOnlineClient(options: Partial<ClientOptions>) {
    const clientOptions = {
      ...defaultClientOptions,
      ...options
    };
    logger.info('Creating instance of HbauthService.onlineClient with options: %o', clientOptions);
    HbauthService.onlineClient = await new OnlineClient(clientOptions).initialize();
  }
}

export const hbauthService = new HbauthService({ storageType: 'localStorage' });

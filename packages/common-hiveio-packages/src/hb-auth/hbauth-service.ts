import { OnlineClient, ClientOptions, OfflineClient } from '@hiveio/hb-auth';
import { siteConfig } from '@hive/ui/config/site';

import { getLogger } from '@hive/ui/lib/logging';
import { configuredSessionTime } from '@hive/ui/config/public-vars';
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

const getDefaultClientOptions = (): ClientOptions => {
  // I don't think this logic should be here, but for now it is easier to keep it. We have dedicated MemoryMixin (?)
  let node: string | undefined = undefined;
  // Check if user has selected a custom node in localStorage
  if (typeof window === 'object' && window.localStorage) {
    const storedNode = window.localStorage.getItem('node-endpoint');
    if (storedNode) {
      try {
        node = JSON.parse(storedNode);
      } catch (err) {
        logger.error('Error parsing stored node-endpoint from localStorage: %o', err);
      }
    }
  }

  return {
    sessionTimeout: Number(configuredSessionTime),
    chainId: siteConfig.chainId,
    node: node || siteConfig.endpoint,
    workerUrl: getWorkerUrl() // This will be overridden in getOnlineClient
  };
};

let onlineClientPromise: Promise<OnlineClient> | undefined = undefined;
// This should be just a reference retrieved from the onlineClientPromise.
let onlineClient: OnlineClient | undefined = undefined;

let offlineClientPromise: Promise<OfflineClient> | undefined = undefined;

// This is intentionally non-async method as we don't want any race condition for onlineClientPromise !== undefined check
const setOnlineClient = (options: Partial<ClientOptions> = {}): Promise<OnlineClient> => {
  const clientOptions = {
    ...getDefaultClientOptions(),
    ...options
  };
  logger.info('Creating instance of HB-Auth OnlineClient with options: %o', clientOptions);

  onlineClientPromise = new OnlineClient(clientOptions).initialize();

  return onlineClientPromise.then(client => onlineClient = client);
};

// This is intentionally non-async method as we don't want any race condition for offlineClientPromise !== undefined check
const setOfflineClient = (options: Partial<ClientOptions> = {}): Promise<OfflineClient> => {
  const clientOptions = {
    ...getDefaultClientOptions(),
    ...options
  };
  logger.info('Creating instance of HB-Auth OnlineClient with options: %o', clientOptions);

  offlineClientPromise = new OfflineClient(clientOptions).initialize();

  return offlineClientPromise;
};

export const initOnlineClient = (): Promise<OnlineClient> => {
  if (onlineClientPromise)
    return onlineClientPromise;

  return setOnlineClient();
}

export const setOnlineClientRpcEndpoint = (newEndpoint: string): void => {
  // Even though we are calling setOnlineClient again, we should ensure the call flow is correct (init first -> modify next)
  if (!onlineClient) {
    throw new Error('OnlineClient is not initialized yet. Call initOnlineClient() first.');
  }

  // XXX: This is breaking interface, but we should implement specific sync method in hb-auth to change endpointUrl as it
  // can be changed without re-initialization of the entire hb-auth, just like here:
  (onlineClient as any).hiveChain.api.endpointUrl = newEndpoint;
};

export const getOnlineClient = (): Promise<OnlineClient> => {
  if (onlineClientPromise)
    return onlineClientPromise;

  return setOnlineClient();
};

export const getOfflineClient = (): Promise<OfflineClient> => {
  if (offlineClientPromise)
    return offlineClientPromise;

  return setOfflineClient();
};

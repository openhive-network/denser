import { OnlineClient, ClientOptions, OfflineClient, DEFAULT_INIT_TIMEOUT } from '@hiveio/hb-auth';

import { getLogger } from '@hive/ui/lib/logging';
import { configuredSessionTime } from '@hive/ui/config/public-vars';
import env from '@beam-australia/react-env';
import { getChain } from '../wax';

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
  return {
    sessionTimeout: Number(configuredSessionTime),
    workerUrl: getWorkerUrl(),
    initTimeout: DEFAULT_INIT_TIMEOUT
  };
};

let onlineClientPromise: Promise<OnlineClient> | undefined = undefined;
// This should be just a reference retrieved from the onlineClientPromise.
let onlineClient: OnlineClient | undefined = undefined;

let offlineClientPromise: Promise<OfflineClient> | undefined = undefined;

// This is intentionally non-async method as we don't want any race condition for onlineClientPromise !== undefined check
const setOnlineClient = async (options: Partial<ClientOptions> = {}): Promise<OnlineClient> => {
  const clientOptions = {
    ...getDefaultClientOptions(),
    ...options
  };
  logger.info('Creating instance of HB-Auth OnlineClient with options: %o', clientOptions);

  const chain = await getChain();

  const client = new OnlineClient(clientOptions);

  await client.initialize(chain);

  return client;
};

// This is intentionally non-async method as we don't want any race condition for offlineClientPromise !== undefined check
const setOfflineClient = async (options: Partial<ClientOptions> = {}): Promise<OfflineClient> => {
  const clientOptions = {
    ...getDefaultClientOptions(),
    ...options
  };
  logger.info('Creating instance of HB-Auth OfflineClient with options: %o', clientOptions);

  const chain = await getChain();

  const client = new OfflineClient(clientOptions);

  await client.initialize(chain);

  return client;
};

export const getOnlineClient = (): Promise<OnlineClient> => {
  if (onlineClientPromise)
    return onlineClientPromise;

  return onlineClientPromise = setOnlineClient();
};

export const getOfflineClient = (): Promise<OfflineClient> => {
  if (offlineClientPromise)
    return offlineClientPromise;

  return offlineClientPromise = setOfflineClient();
};

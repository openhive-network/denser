import { OnlineClient, ClientOptions, OfflineClient } from '@hiveio/hb-auth';

import { getLogger } from '@hive/ui/lib/logging';
import { configuredSessionTime } from '@hive/ui/config/public-vars';
import env from '@beam-australia/react-env';

// Import chain service lazily to avoid circular dependency issues at module load time.
// The getChain function is only called inside async functions after both modules are loaded.
import { getChain } from '../wax/hive-chain-service';

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

// ClientOptions no longer includes chainId and node - these are now part of the chain instance
const getDefaultClientOptions = (): ClientOptions => {
  return {
    sessionTimeout: Number(configuredSessionTime),
    workerUrl: getWorkerUrl()
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

  // Get the shared chain instance and pass it to initialize()
  // The chain is managed by hive-chain-service which handles endpoint configuration
  onlineClientPromise = getChain().then(async (chain) => {
    const client = await new OnlineClient(clientOptions).initialize(chain);
    onlineClient = client;
    return client;
  });

  return onlineClientPromise;
};

// This is intentionally non-async method as we don't want any race condition for offlineClientPromise !== undefined check
const setOfflineClient = (options: Partial<ClientOptions> = {}): Promise<OfflineClient> => {
  const clientOptions = {
    ...getDefaultClientOptions(),
    ...options
  };
  logger.info('Creating instance of HB-Auth OfflineClient with options: %o', clientOptions);

  // Get the shared chain instance and pass it to initialize()
  offlineClientPromise = getChain().then(async (chain) => {
    return await new OfflineClient(clientOptions).initialize(chain);
  });

  return offlineClientPromise;
};

export const initOnlineClient = (): Promise<OnlineClient> => {
  if (onlineClientPromise)
    return onlineClientPromise;

  return setOnlineClient();
}

/**
 * @deprecated No longer needed - hb-auth now shares the chain instance with hive-chain-service.
 * Endpoint changes via setRpcEndpoint() in hive-chain-service automatically affect hb-auth.
 * Kept for backwards compatibility.
 */
export const setOnlineClientRpcEndpoint = (_newEndpoint: string): void => {
  // No-op: hb-auth now shares the chain instance with hive-chain-service.
  // Endpoint changes are handled automatically via the shared chain reference.
  logger.debug('setOnlineClientRpcEndpoint is deprecated - endpoint changes are now automatic via shared chain');
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

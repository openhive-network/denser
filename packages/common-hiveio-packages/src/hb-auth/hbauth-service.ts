import {
  OnlineClient,
  ClientOptions,
  OfflineClient,
  DEFAULT_INIT_TIMEOUT,
  type AuthStatus,
  type KeyAuthorityType
} from '@hiveio/hb-auth';

import { getLogger } from '@hive/ui/lib/logging';
import { configuredSessionTime } from '@hive/ui/config/public-vars';
import env from '@beam-australia/react-env';
import { getChain } from '../wax';
import { getSafeStorageGeneration, renewSafeStorageGeneration } from './safe-storage-generation';

const logger = getLogger('app');

// Get the worker URL with proper basePath handling, naming the safe storage generation the worker
// reads (safe-storage-generation.ts)
const getWorkerUrl = (generation: string | null): string => {
  // Only run in browser context
  if (typeof window === 'undefined') {
    return '/auth/worker.js';
  }

  const query = generation ? `?storage=${encodeURIComponent(generation)}` : '';

  const basePath = env('BASE_PATH') || '';

  // For subdirectory deployments, construct the full URL to avoid path issues
  if (basePath) {
    // Use the current origin to construct an absolute URL
    const origin = window.location.origin;
    const workerUrl = `${origin}${basePath}/auth/worker.js${query}`;
    logger.debug('Worker URL (absolute) computed as: %s (basePath: %s)', workerUrl, basePath);

    return workerUrl;
  }

  // For root deployments, use relative path
  const workerUrl = `/auth/worker.js${query}`;
  logger.debug('Worker URL (relative) computed as: %s', workerUrl);

  return workerUrl;
};

const getDefaultClientOptions = (generation: string | null): ClientOptions => {
  return {
    sessionTimeout: Number(configuredSessionTime),
    workerUrl: getWorkerUrl(generation),
    initTimeout: DEFAULT_INIT_TIMEOUT
  };
};

let onlineClientPromise: Promise<OnlineClient> | undefined = undefined;
// The safe storage generation the cached online client's worker holds the wallet files of
let onlineClientGeneration: string | null = null;
// This should be just a reference retrieved from the onlineClientPromise.
let onlineClient: OnlineClient | undefined = undefined;

let offlineClientPromise: Promise<OfflineClient> | undefined = undefined;

/** The safe storage generation, starting one when there is none (site data cleared, first use) */
const currentSafeStorageGeneration = (): string | null =>
  getSafeStorageGeneration() ?? renewSafeStorageGeneration();

/**
 * Its worker holds the wallet files it writes, so after each write the client renews the safe storage
 * generation and stays current; clients holding an older one are replaced when next asked for.
 */
class GenerationRenewingOnlineClient extends OnlineClient {
  #generation: string | null;

  constructor(clientOptions: ClientOptions, generation: string | null) {
    super(clientOptions);
    this.#generation = generation;
  }

  override async register(
    username: string,
    password: string,
    wifKey: string,
    keyType: KeyAuthorityType,
    strict?: boolean
  ): Promise<AuthStatus> {
    const status = await super.register(username, password, wifKey, keyType, strict);
    this.renewGeneration();
    return status;
  }

  override async importKey(username: string, wifKey: string, keyType: KeyAuthorityType): Promise<string> {
    const publicKey = await super.importKey(username, wifKey, keyType);
    this.renewGeneration();
    return publicKey;
  }

  override async invalidateExistingKey(username: string, keyType: KeyAuthorityType): Promise<void> {
    await super.invalidateExistingKey(username, keyType);
    this.renewGeneration();
  }

  private renewGeneration(): void {
    const isCached = onlineClientGeneration === this.#generation;
    this.#generation = renewSafeStorageGeneration();
    if (isCached) onlineClientGeneration = this.#generation;
  }
}

// This is intentionally non-async method as we don't want any race condition for onlineClientPromise !== undefined check
const setOnlineClient = async (generation: string | null): Promise<OnlineClient> => {
  const clientOptions = getDefaultClientOptions(generation);
  logger.info('Creating instance of HB-Auth OnlineClient with options: %o', clientOptions);

  const chain = await getChain();

  const client = new GenerationRenewingOnlineClient(clientOptions, generation);

  await client.initialize(chain);

  return client;
};

// This is intentionally non-async method as we don't want any race condition for offlineClientPromise !== undefined check
const setOfflineClient = async (): Promise<OfflineClient> => {
  const clientOptions = getDefaultClientOptions(currentSafeStorageGeneration());
  logger.info('Creating instance of HB-Auth OfflineClient with options: %o', clientOptions);

  const chain = await getChain();

  const client = new OfflineClient(clientOptions);

  await client.initialize(chain);

  return client;
};

/**
 * The online client, replaced by one with a new worker when another page changed safe storage's wallet
 * files since it was created: the new worker reads them, and starts with every key locked.
 */
export const getOnlineClient = (): Promise<OnlineClient> => {
  const generation = currentSafeStorageGeneration();
  if (onlineClientPromise && generation === onlineClientGeneration)
    return onlineClientPromise;

  if (onlineClientPromise) logger.info('Safe storage changed in another page; starting a new HB-Auth worker');
  onlineClientGeneration = generation;
  const clientPromise = setOnlineClient(generation).catch((error) => {
    // Clear cache so next call retries, unless a newer client replaced it already
    if (onlineClientPromise === clientPromise) onlineClientPromise = undefined;
    throw error;
  });
  onlineClientPromise = clientPromise;
  return clientPromise;
};

export const getOfflineClient = (): Promise<OfflineClient> => {
  if (offlineClientPromise)
    return offlineClientPromise;

  offlineClientPromise = setOfflineClient().catch((error) => {
    offlineClientPromise = undefined; // Clear cache so next call retries
    throw error;
  });
  return offlineClientPromise;
};

import {
  OnlineClient,
  type ClientOptions,
  OfflineClient,
  DEFAULT_INIT_TIMEOUT,
  type AuthStatus,
  type KeyAuthorityType
} from '@hiveio/hb-auth';

import { getLogger } from '@hive/ui/lib/logging';
import { configuredSessionTime } from '@hive/ui/config/public-vars';
import env from '@beam-australia/react-env';
import { getChain } from '../wax';
import { getWorkerGeneration, renewSafeStorageGeneration } from './safe-storage-generation';

const logger = getLogger('app');

const getBasePath = (): string => env('BASE_PATH') || '';

// Get the worker URL with proper basePath handling, naming the safe storage generation the worker
// reads (safe-storage-generation.ts)
const getWorkerUrl = (generation: string | null): string => {
  // Only run in browser context
  if (typeof window === 'undefined') {
    return '/auth/worker.js';
  }

  const query = generation ? `?storage=${encodeURIComponent(generation)}` : '';

  const basePath = getBasePath();

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
// The safe storage generation the cached online client's worker URL names
let onlineClientGeneration: string | null = null;
// This should be just a reference retrieved from the onlineClientPromise.
let onlineClient: OnlineClient | undefined = undefined;

let offlineClientPromise: Promise<OfflineClient> | undefined = undefined;

/** The safe storage generation this app's clients name in their worker URL */
const currentWorkerGeneration = (): string | null => getWorkerGeneration(getBasePath());

/**
 * Its worker holds the wallet files it writes, so after each write the client renews the safe storage
 * generation as this app's worker's: the app's pages keep sharing that worker, and whatever it has
 * unlocked, while other apps' clients are replaced when next asked for.
 */
class GenerationRenewingOnlineClient extends OnlineClient {
  readonly #generation: string | null;

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
    renewSafeStorageGeneration(getBasePath(), this.#generation);
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
  const clientOptions = getDefaultClientOptions(currentWorkerGeneration());
  logger.info('Creating instance of HB-Auth OfflineClient with options: %o', clientOptions);

  const chain = await getChain();

  const client = new OfflineClient(clientOptions);

  await client.initialize(chain);

  return client;
};

/** Locks the worker of a replaced client, which no page of this app is to sign with any more */
const lockReplacedClient = (clientPromise: Promise<OnlineClient>): void => {
  clientPromise
    .then((client) => client.lock())
    .catch((error: unknown) => {
      // hb-auth rejects locking a worker that has no unlocked session
      logger.info('Did not lock the replaced HB-Auth worker: %s', error instanceof Error ? error.message : String(error));
    });
};

/**
 * The online client, replaced by one with another worker when another app changed safe storage's
 * wallet files since it was created: the new worker reads them, and starts with every key locked. The
 * replaced worker is locked, so no page of this app keeps signing with it.
 */
export const getOnlineClient = (): Promise<OnlineClient> => {
  const generation = currentWorkerGeneration();
  if (onlineClientPromise && generation === onlineClientGeneration)
    return onlineClientPromise;

  if (onlineClientPromise) {
    logger.info('Safe storage changed in another app; starting a new HB-Auth worker');
    lockReplacedClient(onlineClientPromise);
  }
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

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
import {
  getAppWorkerGenerations,
  getWorkerGeneration,
  recordAppWorkerGeneration,
  renewSafeStorageGeneration
} from './safe-storage-generation';
import { holdWorker } from './worker-release';

const logger = getLogger('app');

const getBasePath = (): string => env('BASE_PATH') || '';

// The apps' entry for hb-auth's worker, which ends once released (worker-release.ts)
const WORKER_PATH = '/auth/releasable-worker.js';

// Get the worker URL with proper basePath handling, naming the safe storage generation the worker
// reads (safe-storage-generation.ts)
const getWorkerUrl = (generation: string | null): string => {
  // Only run in browser context
  if (typeof window === 'undefined') {
    return WORKER_PATH;
  }

  const query = generation ? `?storage=${encodeURIComponent(generation)}` : '';

  const basePath = getBasePath();

  // For subdirectory deployments, construct the full URL to avoid path issues
  if (basePath) {
    // Use the current origin to construct an absolute URL
    const origin = window.location.origin;
    const workerUrl = `${origin}${basePath}${WORKER_PATH}${query}`;
    logger.debug('Worker URL (absolute) computed as: %s (basePath: %s)', workerUrl, basePath);

    return workerUrl;
  }

  // For root deployments, use relative path
  const workerUrl = `${WORKER_PATH}${query}`;
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

// Lets go of the worker each online client holds (worker-release.ts)
const workerReleases = new WeakMap<OnlineClient, () => void>();

// The operations running with each online client (withOnlineClient), which a replaced client's worker
// is locked only after
const clientOperations = new Map<Promise<OnlineClient>, Set<Promise<unknown>>>();

/** The safe storage generation this app's clients name in their worker URL */
const currentWorkerGeneration = (): string | null => getWorkerGeneration(getBasePath());

/**
 * Its worker holds the wallet files it writes, so after each write the client renews the safe storage
 * generation as this app's worker's: the app's pages keep sharing that worker, and whatever it has
 * unlocked, while other apps' clients are replaced when next asked for. A client whose worker another
 * write superseded writes through the app's current client instead, as its worker would write back
 * wallet files older than that write.
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
    const current = await this.currentClient();
    if (current !== this) return current.register(username, password, wifKey, keyType, strict);
    const status = await super.register(username, password, wifKey, keyType, strict);
    this.renewGeneration();
    return status;
  }

  override async importKey(username: string, wifKey: string, keyType: KeyAuthorityType): Promise<string> {
    const current = await this.currentClient();
    if (current !== this) return current.importKey(username, wifKey, keyType);
    const publicKey = await super.importKey(username, wifKey, keyType);
    this.renewGeneration();
    return publicKey;
  }

  override async invalidateExistingKey(username: string, keyType: KeyAuthorityType): Promise<void> {
    const current = await this.currentClient();
    if (current !== this) return current.invalidateExistingKey(username, keyType);
    await super.invalidateExistingKey(username, keyType);
    this.renewGeneration();
  }

  /** This client while its worker is the app's current one; otherwise the app's current client */
  private currentClient(): Promise<OnlineClient> {
    if (this.#generation === currentWorkerGeneration()) return Promise.resolve(this);
    logger.info('Safe storage changed since this HB-Auth client was created; writing through the current one');
    return getOnlineClient();
  }

  private renewGeneration(): void {
    // Another write renewed the generation while this one ran: its worker wrote files older than that
    if (renewSafeStorageGeneration(getBasePath(), this.#generation) === null)
      logger.warn('Did not renew the safe storage generation after a write through a replaced HB-Auth worker');
  }
}

/**
 * Initializes `client`, and starts its worker's session with a single call: hb-auth's worker starts
 * beekeeper, and instantiates its WASM, for every call that reaches it before the first start
 * finished, and keeps only the last one.
 */
const startClient = async (client: OnlineClient | OfflineClient, chain: Awaited<ReturnType<typeof getChain>>) => {
  await client.initialize(chain);
  await client.getRegisteredUsers();
};

// This is intentionally non-async method as we don't want any race condition for onlineClientPromise !== undefined check
const setOnlineClient = async (generation: string | null): Promise<OnlineClient> => {
  const clientOptions = getDefaultClientOptions(generation);
  logger.info('Creating instance of HB-Auth OnlineClient with options: %o', clientOptions);

  const chain = await getChain();
  // The app's current worker is retired only after its pages moved to another one
  const releaseWorker = (await holdWorker(clientOptions.workerUrl)) ?? (() => {});

  const client = new GenerationRenewingOnlineClient(clientOptions, generation);

  try {
    await startClient(client, chain);
  } catch (error) {
    releaseWorker();
    throw error;
  }
  workerReleases.set(client, releaseWorker);

  return client;
};

// This is intentionally non-async method as we don't want any race condition for offlineClientPromise !== undefined check
const setOfflineClient = async (): Promise<OfflineClient> => {
  const clientOptions = getDefaultClientOptions(currentWorkerGeneration());
  logger.info('Creating instance of HB-Auth OfflineClient with options: %o', clientOptions);

  const chain = await getChain();
  // Held while the page lives: the offline client is never replaced
  await holdWorker(clientOptions.workerUrl);

  const client = new OfflineClient(clientOptions);

  await startClient(client, chain);

  return client;
};

/** Locks the worker of a replaced client, which no page of this app is to sign with any more. */
const lockReplacedWorker = async (client: OnlineClient): Promise<void> => {
  try {
    await client.lock();
  } catch (error: unknown) {
    // hb-auth rejects locking a worker that has no unlocked session
    logger.info('Did not lock the replaced HB-Auth worker: %s', error instanceof Error ? error.message : String(error));
  }
};

/**
 * Locks the worker of a replaced client once the operations running with it settle, and lets go of
 * it, so it ends, with its WASM, once no page uses it.
 */
const retireReplacedClient = (clientPromise: Promise<OnlineClient>): void => {
  Promise.allSettled(clientOperations.get(clientPromise) ?? [])
    .then(() => clientPromise)
    .then(async (client) => {
      await lockReplacedWorker(client);
      workerReleases.get(client)?.();
    })
    .catch((error: unknown) => {
      // The client failed to initialize, and let go of its worker then
      logger.info('Replaced an HB-Auth client that did not start: %s', error instanceof Error ? error.message : String(error));
    });
};

/**
 * The online client, replaced by one with another worker when another app changed safe storage's
 * wallet files since it was created: the new worker reads them, and starts with every key locked. The
 * replaced worker is locked, so no page of this app keeps signing with it, and released.
 */
export const getOnlineClient = (): Promise<OnlineClient> => {
  const generation = currentWorkerGeneration();
  if (onlineClientPromise && generation === onlineClientGeneration)
    return onlineClientPromise;

  if (onlineClientPromise) {
    logger.info('Safe storage changed in another app; starting a new HB-Auth worker');
    retireReplacedClient(onlineClientPromise);
  }
  onlineClientGeneration = generation;
  recordAppWorkerGeneration(getBasePath(), generation);
  const clientPromise = setOnlineClient(generation).catch((error) => {
    // Clear cache so next call retries, unless a newer client replaced it already
    if (onlineClientPromise === clientPromise) onlineClientPromise = undefined;
    throw error;
  });
  onlineClientPromise = clientPromise;
  return clientPromise;
};

/**
 * Runs `operation` with the online client, which keeps its worker unlocked until `operation` settles
 * even when another app's write replaces it meanwhile. Resolves and rejects as `operation` does.
 */
export const withOnlineClient = async <T>(operation: (client: OnlineClient) => Promise<T>): Promise<T> => {
  const clientPromise = getOnlineClient();
  const running = clientPromise.then(operation);
  const operations = clientOperations.get(clientPromise) ?? new Set<Promise<unknown>>();
  clientOperations.set(clientPromise, operations);
  operations.add(running);
  try {
    return await running;
  } finally {
    operations.delete(running);
    if (!operations.size) clientOperations.delete(clientPromise);
  }
};

/** Logs `username` out of the worker of a client this app no longer creates */
const logoutFromReplacedWorker = async (generation: string | null, username: string): Promise<void> => {
  const clientOptions = getDefaultClientOptions(generation);
  let releaseWorker: (() => void) | null = null;
  try {
    const chain = await getChain();
    releaseWorker = await holdWorker(clientOptions.workerUrl);
    // A page retired it, locking it first
    if (!releaseWorker) return;
    const client = new OnlineClient(clientOptions);
    await client.initialize(chain);
    await client.logout(username);
  } catch (error: unknown) {
    logger.info('Did not log out of a replaced HB-Auth worker: %s', error instanceof Error ? error.message : String(error));
  } finally {
    releaseWorker?.();
  }
};

/**
 * Logs `username` out of the online client's worker, and out of every worker this app's clients were
 * created with before: a page that has not asked for a client since keeps signing with its own.
 * Rejects as the online client's logout does.
 */
export const logoutFromEveryWorker = async (username: string): Promise<void> => {
  const clientPromise = getOnlineClient();
  const currentGeneration = onlineClientGeneration;
  const replaced = getAppWorkerGenerations(getBasePath()).filter((generation) => generation !== currentGeneration);
  await Promise.all(replaced.map((generation) => logoutFromReplacedWorker(generation, username)));
  await (await clientPromise).logout(username);
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

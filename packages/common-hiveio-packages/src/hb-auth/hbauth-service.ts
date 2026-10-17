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
import { holdRunningWorker, holdWorker, otherRunningWorkers, startWithWorker } from './worker-release';

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

let onlineClientPromise: Promise<GenerationRenewingOnlineClient> | undefined = undefined;
// The safe storage generation the cached online client's worker URL names
let onlineClientGeneration: string | null = null;
// This should be just a reference retrieved from the onlineClientPromise.
let onlineClient: OnlineClient | undefined = undefined;

let offlineClientPromise: Promise<OfflineClient> | undefined = undefined;

// Lets go of the worker each online client holds (worker-release.ts)
const workerReleases = new WeakMap<OnlineClient, () => void>();

/** The safe storage generation this app's clients name in their worker URL */
const currentWorkerGeneration = (): string | null => getWorkerGeneration(getBasePath());

/**
 * Its worker holds the wallet files it writes, so right after each write the client renews the safe
 * storage generation as this app's worker's: the app's pages keep sharing that worker, and whatever it
 * has unlocked, while other apps' clients are replaced when next asked for. A client whose worker
 * another write superseded writes through the app's current client instead, as its worker would write
 * back wallet files older than that write; so does a write another app's write superseded while it ran.
 */
class GenerationRenewingOnlineClient extends OnlineClient {
  readonly #generation: string | null;
  #operations = 0;
  #onIdle: (() => void)[] = [];

  constructor(clientOptions: ClientOptions, generation: string | null) {
    super(clientOptions);
    this.#generation = generation;
  }

  /** Whether its worker is the app's current one */
  get isCurrent(): boolean {
    return this.#generation === currentWorkerGeneration();
  }

  beginOperation(): void {
    this.#operations += 1;
  }

  endOperation(): void {
    if (--this.#operations > 0) return;
    this.#onIdle.splice(0).forEach((resolve) => resolve());
  }

  /** Resolves once no operation runs with the client */
  whenIdle(): Promise<void> {
    if (!this.#operations) return Promise.resolve();
    return new Promise((resolve) => this.#onIdle.push(resolve));
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
    return this.renewGeneration() ? status : this.register(username, password, wifKey, keyType, strict);
  }

  override async importKey(username: string, wifKey: string, keyType: KeyAuthorityType): Promise<string> {
    const current = await this.currentClient();
    if (current !== this) return current.importKey(username, wifKey, keyType);
    const publicKey = await super.importKey(username, wifKey, keyType);
    return this.renewGeneration() ? publicKey : this.importKey(username, wifKey, keyType);
  }

  override async invalidateExistingKey(username: string, keyType: KeyAuthorityType): Promise<void> {
    const current = await this.currentClient();
    if (current !== this) return current.invalidateExistingKey(username, keyType);
    await super.invalidateExistingKey(username, keyType);
    if (!this.renewGeneration()) await this.invalidateExistingKey(username, keyType);
  }

  /** This client while its worker is the app's current one; otherwise the app's current client */
  private currentClient(): Promise<OnlineClient> {
    if (this.isCurrent) return Promise.resolve(this);
    logger.info('Safe storage changed since this HB-Auth client was created; writing through the current one');
    return getOnlineClient();
  }

  /**
   * Records the wallet files this client's worker wrote as the app's current generation. False when
   * another write renewed the generation while this one ran: the write is to be repeated through the
   * app's current client, as this client's worker holds files older than that write.
   */
  renewGeneration(): boolean {
    // Null also where localStorage cannot keep a generation, which leaves the client current
    if (renewSafeStorageGeneration(getBasePath(), this.#generation) !== null || this.isCurrent) return true;
    logger.warn('Safe storage changed during a write through this HB-Auth worker; repeating it through the current one');
    return false;
  }
}

/**
 * Initializes `client`, and starts its worker's session with a single call, after the clients other
 * pages are starting with that worker: hb-auth's worker starts beekeeper, and instantiates its WASM,
 * for every call that reaches it before the first start finished, and keeps only the last one.
 */
const startClient = (
  client: OnlineClient | OfflineClient,
  chain: Awaited<ReturnType<typeof getChain>>,
  workerUrl: string
): Promise<void> =>
  startWithWorker(workerUrl, async () => {
    await client.initialize(chain);
    await client.getRegisteredUsers();
  });

// This is intentionally non-async method as we don't want any race condition for onlineClientPromise !== undefined check
const setOnlineClient = async (generation: string | null): Promise<GenerationRenewingOnlineClient> => {
  const clientOptions = getDefaultClientOptions(generation);
  logger.info('Creating instance of HB-Auth OnlineClient with options: %o', clientOptions);

  const chain = await getChain();
  // The app's current worker is retired only after its pages moved to another one
  const releaseWorker = (await holdWorker(clientOptions.workerUrl)) ?? (() => {});

  const client = new GenerationRenewingOnlineClient(clientOptions, generation);

  try {
    await startClient(client, chain, clientOptions.workerUrl);
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

  await startClient(client, chain, clientOptions.workerUrl);

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
const retireReplacedClient = (clientPromise: Promise<GenerationRenewingOnlineClient>): void => {
  clientPromise
    .then(async (client) => {
      await client.whenIdle();
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
export const getOnlineClient = (): Promise<OnlineClient> => getRenewingOnlineClient();

const getRenewingOnlineClient = (): Promise<GenerationRenewingOnlineClient> => {
  const generation = currentWorkerGeneration();
  if (onlineClientPromise && generation === onlineClientGeneration)
    return onlineClientPromise;

  if (onlineClientPromise) {
    logger.info('Safe storage changed in another app; starting a new HB-Auth worker');
    retireReplacedClient(onlineClientPromise);
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

// The client methods that write the wallet files. Not the passkey methods: hb-auth keeps passkeys in
// an IndexedDB database of their own, written and read by the page rather than the worker.
const WRITE_METHODS = new Set<PropertyKey>(['register', 'importKey', 'invalidateExistingKey']);

/**
 * The client an operation runs with: the online client it started with, until a write finds that
 * client's worker superseded, or another app's write supersedes it during a write. The write, and
 * every call after it, then go to the app's current client, so a key the operation registers is in
 * the worker it signs with. Every write renews the safe storage generation, so a worker another app
 * started between two writes of the operation is replaced before it writes back files without the
 * later one.
 */
class OnlineClientOperation {
  #client: GenerationRenewingOnlineClient;
  readonly client: OnlineClient;

  constructor(client: GenerationRenewingOnlineClient) {
    this.#client = client;
    this.client = new Proxy<OnlineClient>(client, {
      get: (_target, property) => {
        const value: unknown = Reflect.get(this.#client, property, this.#client);
        if (typeof value !== 'function') return value;
        if (!WRITE_METHODS.has(property)) return value.bind(this.#client);
        return (...args: unknown[]) => this.write(property, args);
      }
    });
  }

  end(): void {
    this.#client.endOperation();
  }

  private async write(method: PropertyKey, args: unknown[]): Promise<unknown> {
    await this.followCurrentClient();
    const writer = this.#client;
    // OnlineClient's own write, which leaves renewing the generation to the operation
    const result: unknown = await Reflect.apply(Reflect.get(OnlineClient.prototype, method), writer, args);
    return writer.renewGeneration() ? result : this.write(method, args);
  }

  private async followCurrentClient(): Promise<void> {
    if (this.#client.isCurrent) return;
    const current = await getRenewingOnlineClient();
    if (current === this.#client) return;
    current.beginOperation();
    this.#client.endOperation();
    this.#client = current;
  }
}

/**
 * Runs `operation` with the online client, which keeps its worker unlocked until `operation` settles
 * even when another app's write replaces it meanwhile; once a write of `operation` finds it replaced,
 * `operation` continues with the current one, as it does when another app's write supersedes the
 * client during a write of `operation`, which is repeated there. Every write of `operation` renews the
 * safe storage generation. Resolves and rejects as `operation` does.
 */
export const withOnlineClient = async <T>(operation: (client: OnlineClient) => Promise<T>): Promise<T> => {
  // Begun as the client resolves, before a replacement can retire it
  const running = await getRenewingOnlineClient().then((client) => {
    client.beginOperation();
    return new OnlineClientOperation(client);
  });
  try {
    return await operation(running.client);
  } finally {
    running.end();
  }
};

/** Logs `username` out of the running worker at `workerUrl`, of a client this app no longer creates */
const logoutFromReplacedWorker = async (workerUrl: string, username: string): Promise<void> => {
  const releaseWorker = await holdRunningWorker(workerUrl);
  // No page holds it, so it does not run, or a page is retiring it, locking it first
  if (!releaseWorker) return;
  try {
    const chain = await getChain();
    const client = new OnlineClient({ ...getDefaultClientOptions(null), workerUrl });
    await startWithWorker(workerUrl, async () => {
      await client.initialize(chain);
      await client.logout(username);
    });
  } catch (error: unknown) {
    logger.info('Did not log out of a replaced HB-Auth worker: %s', error instanceof Error ? error.message : String(error));
  } finally {
    releaseWorker();
  }
};

/**
 * Logs `username` out of the online client's worker, and out of every other running worker of this
 * app: a page that has not asked for a client since keeps signing with its own. A worker no page
 * holds is not running, and is not started to be logged out of. Rejects as the online client's
 * logout does.
 */
export const logoutFromEveryWorker = async (username: string): Promise<void> => {
  const clientPromise = getOnlineClient();
  const replaced = await otherRunningWorkers(getWorkerUrl(onlineClientGeneration));
  await Promise.all(replaced.map((workerUrl) => logoutFromReplacedWorker(workerUrl, username)));
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

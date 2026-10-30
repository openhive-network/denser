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
import { getWorkerGeneration, renewSafeStorageGeneration, whenSafeStorageSettles } from './safe-storage-generation';
import { holdRunningWorker, holdWorker, otherRunningWorkers, startWithWorker } from './worker-release';
import { runOperation, type OnlineClientOperationOptions, type OperationClient } from './online-client-operation';

export { SupersededKeyWriteError, type OnlineClientOperationOptions } from './online-client-operation';

const logger = getLogger('app');

const getBasePath = (): string => env('BASE_PATH') || '';

// The apps' entry for hb-auth's worker, which ends once released (worker-release.ts)
const WORKER_PATH = '/auth/releasable-worker.js';

// Get the worker URL with proper basePath handling, naming the safe storage generation the worker
// reads (safe-storage-generation.ts)
const getWorkerUrl = (generation: string | null, basePath = getBasePath()): string => {
  // Only run in browser context
  if (typeof window === 'undefined') {
    return WORKER_PATH;
  }

  const query = generation ? `?storage=${encodeURIComponent(generation)}` : '';

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

const getDefaultClientOptions = (generation: string | null, basePath = getBasePath()): ClientOptions => {
  return {
    sessionTimeout: Number(configuredSessionTime),
    workerUrl: getWorkerUrl(generation, basePath),
    initTimeout: DEFAULT_INIT_TIMEOUT
  };
};

let onlineClientPromise: Promise<GenerationRenewingOnlineClient> | undefined = undefined;
// The safe storage generation the cached online client's worker URL names
let onlineClientGeneration: string | null = null;
// This should be just a reference retrieved from the onlineClientPromise.
let onlineClient: OnlineClient | undefined = undefined;

// The client replacing the online client, started once safe storage settles
let replacementPromise: Promise<GenerationRenewingOnlineClient> | undefined = undefined;
// Resolves once the worker the last replacement retired was let go of, or found held by an operation
let lastRetirement: Promise<void> = Promise.resolve();
// Whether an operation waits for the pending replacement, which then does not wait for other apps' operations
let operationAwaitsReplacement = false;

let offlineClientPromise: Promise<OfflineClient> | undefined = undefined;

// Lets go of the worker each online client holds (worker-release.ts)
const workerReleases = new WeakMap<OnlineClient, () => void>();

/** The safe storage generation the clients of the app at `basePath` name in their worker URL */
const currentWorkerGeneration = (basePath = getBasePath()): string | null => getWorkerGeneration(basePath);

/**
 * Its worker holds the wallet files it writes, so right after each write the client renews the safe
 * storage generation as this app's worker's: the app's pages keep sharing that worker, and whatever it
 * has unlocked, while other apps' clients are replaced once safe storage settles. Each write runs as an
 * operation of its own (OnlineClientOperation), which repeats it in the app's current client when
 * another write superseded this client's worker.
 */
class GenerationRenewingOnlineClient extends OnlineClient implements OperationClient {
  readonly #generation: string | null;
  readonly #basePath: string;
  #operations = 0;
  #onIdle: (() => void)[] = [];

  constructor(clientOptions: ClientOptions, generation: string | null, basePath: string) {
    super(clientOptions);
    this.#generation = generation;
    this.#basePath = basePath;
  }

  /** The base path of the app the client is of */
  get basePath(): string {
    return this.#basePath;
  }

  /** Whether its worker is the app's current one */
  get isCurrent(): boolean {
    return this.#generation === currentWorkerGeneration(this.#basePath);
  }

  beginOperation(): void {
    this.#operations += 1;
  }

  endOperation(): void {
    if (--this.#operations > 0) return;
    this.#onIdle.splice(0).forEach((resolve) => resolve());
  }

  /** Whether no operation runs with the client */
  get isIdle(): boolean {
    return !this.#operations;
  }

  /** Resolves once no operation runs with the client */
  whenIdle(): Promise<void> {
    if (!this.#operations) return Promise.resolve();
    return new Promise((resolve) => this.#onIdle.push(resolve));
  }

  override register(
    username: string,
    password: string,
    wifKey: string,
    keyType: KeyAuthorityType,
    strict?: boolean
  ): Promise<AuthStatus> {
    this.beginOperation();
    return runOperation(this, getClientForOperation, (client) => client.register(username, password, wifKey, keyType, strict));
  }

  override importKey(username: string, wifKey: string, keyType: KeyAuthorityType): Promise<string> {
    this.beginOperation();
    return runOperation(this, getClientForOperation, (client) => client.importKey(username, wifKey, keyType));
  }

  override invalidateExistingKey(username: string, keyType: KeyAuthorityType): Promise<void> {
    this.beginOperation();
    return runOperation(this, getClientForOperation, (client) => client.invalidateExistingKey(username, keyType));
  }

  /**
   * Records the wallet files this client's worker wrote as the app's current generation. False when
   * another write renewed the generation while this one ran: the write is to be repeated through the
   * app's current client, as this client's worker holds files older than that write.
   */
  renewGeneration(): boolean {
    // Null also where localStorage cannot keep a generation, which leaves the client current
    if (renewSafeStorageGeneration(this.#basePath, this.#generation) !== null || this.isCurrent) return true;
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
const setOnlineClient = async (generation: string | null, basePath: string): Promise<GenerationRenewingOnlineClient> => {
  const clientOptions = getDefaultClientOptions(generation, basePath);
  logger.info('Creating instance of HB-Auth OnlineClient with options: %o', clientOptions);

  const chain = await getChain();
  // The app's current worker is retired only after its pages moved to another one
  const releaseWorker = (await holdWorker(clientOptions.workerUrl)) ?? (() => {});

  const client = new GenerationRenewingOnlineClient(clientOptions, generation, basePath);

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
 * it, so it ends, with its WASM, once no page uses it. Resolves once it let go of it, or, when an
 * operation runs with the client, right away: that operation may wait on the user, and the next
 * replacement is not to wait for it.
 */
const retireReplacedClient = (clientPromise: Promise<GenerationRenewingOnlineClient>): Promise<void> =>
  clientPromise
    .then((client) => {
      const released = client.whenIdle().then(async () => {
        await lockReplacedWorker(client);
        workerReleases.get(client)?.();
      });
      return client.isIdle ? released : undefined;
    })
    .catch((error: unknown) => {
      // The client failed to initialize, and let go of its worker then
      logger.info('Replaced an HB-Auth client that did not start: %s', error instanceof Error ? error.message : String(error));
    });

/**
 * The online client, replaced by one with another worker when another app changed safe storage's
 * wallet files since it was created: the new worker reads them, and starts with every key locked. The
 * replaced worker is locked, so no page of this app keeps signing with it, and released.
 */
export const getOnlineClient = (): Promise<OnlineClient> => getRenewingOnlineClient();

const startOnlineClient = (generation: string | null, basePath: string): Promise<GenerationRenewingOnlineClient> => {
  onlineClientGeneration = generation;
  const clientPromise = setOnlineClient(generation, basePath).catch((error) => {
    // Clear cache so next call retries, unless a newer client replaced it already
    if (onlineClientPromise === clientPromise) onlineClientPromise = undefined;
    throw error;
  });
  onlineClientPromise = clientPromise;
  return clientPromise;
};

/**
 * Replaces `replaced` with a client for the generation safe storage settles at, so the writes of
 * another app's operation start a single worker here. That worker starts only once `replaced`
 * started, and the worker the previous replacement retired was let go of, so the page runs two
 * workers at most, besides those operations still run with: a replacement never waits for an
 * operation, which may wait on the user.
 */
const replaceOnlineClient = async (
  replaced: Promise<GenerationRenewingOnlineClient>,
  basePath: string
): Promise<GenerationRenewingOnlineClient> => {
  await whenSafeStorageSettles(basePath, () => operationAwaitsReplacement);
  await replaced.catch(() => undefined);
  await lastRetirement;
  const generation = currentWorkerGeneration(basePath);
  if (onlineClientPromise && generation === onlineClientGeneration) return onlineClientPromise;
  logger.info('Safe storage changed in another app; starting a new HB-Auth worker');
  lastRetirement = retireReplacedClient(replaced);
  return startOnlineClient(generation, basePath);
};

/**
 * The current client an operation runs, or continues, with: a replacement it waits for waits for
 * safe storage's generation to stay unchanged, not for other apps' operations to end, as one of them
 * may wait for this one.
 */
const getClientForOperation = (basePath = getBasePath()): Promise<GenerationRenewingOnlineClient> => {
  const client = getRenewingOnlineClient(basePath);
  if (replacementPromise) operationAwaitsReplacement = true;
  return client;
};

const getRenewingOnlineClient = (basePath = getBasePath()): Promise<GenerationRenewingOnlineClient> => {
  if (replacementPromise) return replacementPromise;
  const generation = currentWorkerGeneration(basePath);
  if (!onlineClientPromise) return startOnlineClient(generation, basePath);
  if (generation === onlineClientGeneration) return onlineClientPromise;

  const replacement = replaceOnlineClient(onlineClientPromise, basePath).finally(() => {
    if (replacementPromise !== replacement) return;
    replacementPromise = undefined;
    operationAwaitsReplacement = false;
  });
  replacementPromise = replacement;
  return replacement;
};

/**
 * Runs `operation` with the online client, which keeps its worker unlocked until `operation` settles
 * even when another app's write replaces it meanwhile; once a write of `operation` finds it replaced,
 * `operation` continues with the current one, as it does when another app's write supersedes the
 * client during a write of `operation`, which is repeated there. A key write that continues in
 * another worker unlocks it with the password `operation` unlocked with, or, when it did not, with
 * the one `options.requestPassword` asks for. Every write of `operation` renews the safe storage
 * generation. Resolves and rejects as `operation` does; a key write superseded too many times, or
 * failing to be repeated, rejects with SupersededKeyWriteError.
 */
export const withOnlineClient = async <T>(
  operation: (client: OnlineClient) => Promise<T>,
  options: OnlineClientOperationOptions = {}
): Promise<T> => {
  // Begun as the client resolves, before a replacement can retire it
  const client = await getClientForOperation().then((resolved) => {
    resolved.beginOperation();
    return resolved;
  });
  return runOperation(client, getClientForOperation, operation, options);
};

type WorkerLogout = (client: OnlineClient) => Promise<void>;

/** Runs `logout` in the running worker at `workerUrl`, of a client this app no longer creates */
const logoutFromReplacedWorker = async (workerUrl: string, logout: WorkerLogout): Promise<void> => {
  const releaseWorker = await holdRunningWorker(workerUrl);
  // No page holds it, so it does not run, or a page is retiring it, locking it first
  if (!releaseWorker) return;
  try {
    const chain = await getChain();
    const client = new OnlineClient({ ...getDefaultClientOptions(null), workerUrl });
    await startWithWorker(workerUrl, async () => {
      await client.initialize(chain);
      await logout(client);
    });
  } catch (error: unknown) {
    logger.info('Did not log out of a replaced HB-Auth worker: %s', error instanceof Error ? error.message : String(error));
  } finally {
    releaseWorker();
  }
};

/** Runs `logout` in the online client's worker, and in every other running worker of this app */
const logoutOfRunningWorkers = async (logout: WorkerLogout): Promise<void> => {
  const clientPromise = getOnlineClient();
  const replaced = await otherRunningWorkers(getWorkerUrl(onlineClientGeneration));
  await Promise.all(replaced.map((workerUrl) => logoutFromReplacedWorker(workerUrl, logout)));
  await logout(await clientPromise);
};

/**
 * Logs `username` out of the online client's worker, and out of every other running worker of this
 * app: a page that has not asked for a client since keeps signing with its own. A worker no page
 * holds is not running, and is not started to be logged out of. Rejects as the online client's
 * logout does.
 */
export const logoutFromEveryWorker = (username: string): Promise<void> =>
  logoutOfRunningWorkers((client) => client.logout(username));

/**
 * Logs `username` out as `logoutFromEveryWorker` does when this page has asked for the online
 * client; otherwise starts no client and resolves. A running worker is held by a page that asked for
 * one, so of the pages that hear of a logout, those that did lock every running worker.
 */
export const logoutFromStartedWorkers = async (username: string): Promise<void> => {
  if (!onlineClientPromise) return;
  await logoutFromEveryWorker(username);
};

/**
 * Ends the session of, and locks, every user unlocked in any running worker of this app, whether or
 * not this page knows of it, when this page has asked for the online client; otherwise starts no
 * client and resolves, as `logoutFromStartedWorkers` does. Rejects as the online client's logout does.
 */
export const logoutEveryoneFromStartedWorkers = async (): Promise<void> => {
  if (!onlineClientPromise) return;
  await logoutOfRunningWorkers((client) => client.logoutAll());
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

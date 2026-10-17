/**
 * A page cannot end a SharedWorker, which runs, with its beekeeper WASM, while any page that connected
 * to it is open. The apps' hb-auth worker entry (public/auth/releasable-worker.js) ends itself once a
 * page retired it and no page holds it: each page holds a shared Web Lock named after the worker while
 * its clients use it, and the browser releases the lock with the page.
 */
const RETIRE_WORKER_MESSAGE = 'denser:retire-worker';
const WORKER_LOCK_PREFIX = 'denser:hb-auth-worker:';
const WORKER_START_LOCK_PREFIX = 'denser:hb-auth-worker-start:';
const WORKER_CHECK_LOCK_PREFIX = 'denser:hb-auth-worker-check:';
/** How long a client's start keeps the other clients of its worker waiting, at most */
const WORKER_START_LOCK_TIMEOUT_MS = 10_000;

interface WorkerHold {
  clients: number;
  release: () => void;
}

/** The workers (by absolute URL) this page holds, with the number of its clients using each */
const heldWorkers = new Map<string, WorkerHold>();

const absoluteUrl = (workerUrl: string): string => new URL(workerUrl, window.location.href).href;

const workerLockName = (url: string): string => `${WORKER_LOCK_PREFIX}${url}`;

const isWorkerReleasable = (): boolean =>
  typeof window !== 'undefined' && typeof SharedWorker !== 'undefined' && Boolean(navigator.locks);

/** Holds the lock named `name` in shared mode until the returned release is called; null when it is not free now */
const holdSharedLock = (name: string): Promise<(() => void) | null> =>
  new Promise((resolve) => {
    navigator.locks
      .request(name, { mode: 'shared', ifAvailable: true }, (lock) => {
        if (!lock) return resolve(null);
        return new Promise<void>((release) => resolve(release));
      })
      .catch(() => resolve(null));
  });

const retireWorker = (url: string): void => {
  // As hb-auth connects: a SharedWorker connection with other options fails
  const options: WorkerOptions & { extendedLifetime: boolean } = { type: 'module', extendedLifetime: true };
  new SharedWorker(url, options).port.postMessage({ type: RETIRE_WORKER_MESSAGE });
};

const UNTRACKED = (): void => {};

/** The number of holds of the lock named `name`, by any page */
const countHolders = async (name: string): Promise<number> =>
  ((await navigator.locks.query()).held ?? []).filter((lock) => lock.name === name).length;

/**
 * Holds the lock named `name` in shared mode while some other page holds it; null when none does.
 * The checks of all pages are serialized, so a hold one of them took is never counted by another as a
 * page's: each was taken while a page held the lock, so the worker runs while it is held.
 */
const holdSharedLockIfHeld = (url: string, name: string): Promise<(() => void) | null> =>
  navigator.locks.request(`${WORKER_CHECK_LOCK_PREFIX}${url}`, { mode: 'exclusive' }, async () => {
    const releaseLock = await holdSharedLock(name);
    if (!releaseLock || (await countHolders(name)) >= 2) return releaseLock;
    releaseLock();
    return null;
  });

const hold = async (workerUrl: string, runningOnly: boolean): Promise<(() => void) | null> => {
  if (!isWorkerReleasable()) return runningOnly ? null : UNTRACKED;
  const url = absoluteUrl(workerUrl);
  let held = heldWorkers.get(url);
  if (!held) {
    const name = workerLockName(url);
    // Held by no other page, the worker is not running: connecting to it would start it
    const releaseLock = runningOnly ? await holdSharedLockIfHeld(url, name) : await holdSharedLock(name);
    // Another client of this page may have held it meanwhile
    held = heldWorkers.get(url);
    if (held) releaseLock?.();
    else {
      if (!releaseLock) return null;
      held = { clients: 0, release: releaseLock };
      heldWorkers.set(url, held);
    }
  }
  held.clients += 1;
  const hold = held;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--hold.clients > 0) return;
    heldWorkers.delete(url);
    // Sent while the lock is held, so it reaches the running worker rather than starting one
    retireWorker(url);
    hold.release();
  };
};

/**
 * Holds the worker at `workerUrl` for a client of this page, before the client connects to it.
 * Resolves to the release, to call once the client no longer uses the worker: when none of this
 * page's clients do, the worker is retired, and ends as soon as no other page holds it. Resolves to
 * null while the worker is being retired, which may end under a client connecting now; its keys were
 * locked before. Where workers cannot be released the release does nothing.
 */
export function holdWorker(workerUrl: string): Promise<(() => void) | null> {
  return hold(workerUrl, false);
}

/**
 * Holds the worker at `workerUrl` as `holdWorker` does, only while it runs: resolves to null when
 * no page holds it, so a client connecting to it would start it, and where workers cannot be released.
 */
export function holdRunningWorker(workerUrl: string): Promise<(() => void) | null> {
  return hold(workerUrl, true);
}

/**
 * The absolute URLs of the running workers of the worker script `workerUrl` names, with any query,
 * other than `workerUrl`'s own worker: those some page holds. None where workers cannot be released.
 */
export async function otherRunningWorkers(workerUrl: string): Promise<string[]> {
  if (!isWorkerReleasable()) return [];
  const own = absoluteUrl(workerUrl);
  const script = own.split('?')[0];
  const urls = ((await navigator.locks.query()).held ?? []).flatMap(({ name }) =>
    name?.startsWith(WORKER_LOCK_PREFIX) ? [name.slice(WORKER_LOCK_PREFIX.length)] : []
  );
  return [...new Set(urls)].filter((url) => url !== own && (url === script || url.startsWith(`${script}?`)));
}

/**
 * Runs `start`, which starts a client of the worker at `workerUrl`, once the clients pages of this
 * origin are starting with that worker have started: hb-auth's worker instantiates beekeeper's WASM
 * for every client that reaches it before the first one started its session, so the first client to
 * start does so alone, and the others reach the beekeeper it started. A start that has not settled
 * within WORKER_START_LOCK_TIMEOUT_MS lets the next one run meanwhile. Resolves and rejects as `start` does.
 */
export function startWithWorker<T>(workerUrl: string, start: () => Promise<T>): Promise<T> {
  if (!isWorkerReleasable()) return start();
  return new Promise<T>((resolve, reject) => {
    navigator.locks
      .request(`${WORKER_START_LOCK_PREFIX}${absoluteUrl(workerUrl)}`, { mode: 'exclusive' }, () => {
        const started = start();
        started.then(resolve, reject);
        let timer: ReturnType<typeof setTimeout> | undefined;
        const expired = new Promise<void>((expire) => {
          timer = setTimeout(expire, WORKER_START_LOCK_TIMEOUT_MS);
        });
        const settled = started.then(
          () => {},
          () => {}
        );
        return Promise.race([settled, expired]).finally(() => clearTimeout(timer));
      })
      .catch(reject);
  });
}

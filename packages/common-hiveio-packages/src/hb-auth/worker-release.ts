/**
 * A page cannot end a SharedWorker, which runs, with its beekeeper WASM, while any page that connected
 * to it is open. The apps' hb-auth worker entry (public/auth/releasable-worker.js) ends itself once a
 * page retired it and no page holds it: each page holds a shared Web Lock named after the worker while
 * its clients use it, and the browser releases the lock with the page.
 */
const RETIRE_WORKER_MESSAGE = 'denser:retire-worker';
const WORKER_LOCK_PREFIX = 'denser:hb-auth-worker:';

interface WorkerHold {
  clients: number;
  release: () => void;
}

/** The workers (by absolute URL) this page holds, with the number of its clients using each */
const heldWorkers = new Map<string, WorkerHold>();

const absoluteUrl = (workerUrl: string): string => new URL(workerUrl, window.location.href).href;

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

/**
 * Holds the worker at `workerUrl` for a client of this page, before the client connects to it.
 * Resolves to the release, to call once the client no longer uses the worker: when none of this
 * page's clients do, the worker is retired, and ends as soon as no other page holds it. Resolves to
 * null while the worker is being retired, which may end under a client connecting now; its keys were
 * locked before. Where workers cannot be released the release does nothing.
 */
export async function holdWorker(workerUrl: string): Promise<(() => void) | null> {
  if (!isWorkerReleasable()) return UNTRACKED;
  const url = absoluteUrl(workerUrl);
  let held = heldWorkers.get(url);
  if (!held) {
    const releaseLock = await holdSharedLock(`${WORKER_LOCK_PREFIX}${url}`);
    // Another client of this page may have held it meanwhile
    held = heldWorkers.get(url);
    if (held) releaseLock?.();
    else if (releaseLock) {
      held = { clients: 0, release: releaseLock };
      heldWorkers.set(url, held);
    } else return null;
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
}

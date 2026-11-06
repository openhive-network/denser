/**
 * Which accounts the safe-storage worker this page started holds unlocked, for the UI to show a lock
 * without a signature asking for the password first. Imports nothing that signs: the signing stack,
 * once loaded, registers the probe, so a page that never loaded it starts no worker to be asked.
 *
 * hb-auth's idle lock calls back nothing (its session-end callback runs on logouts only), so the
 * worker is asked every SAFE_STORAGE_LOCK_POLL_MS while anything listens. Asking does not count as
 * activity: beekeeper restarts its idle timer on wallet operations only.
 */
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('app');

export const SAFE_STORAGE_LOCK_POLL_MS = 5_000;

/** The accounts unlocked in the page's safe-storage worker; undefined while the page started none. */
export type SafeStorageLockProbe = () => Promise<readonly string[] | undefined>;

type LockListener = () => void;

let probe: SafeStorageLockProbe | undefined;
let unlockedUsers: ReadonlySet<string> | undefined;
let isProbing = false;
/** Advanced by `forgetSafeStorageLock`, so an answer asked for before it is dropped */
let answerEpoch = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<LockListener>();

const isSameSet = (a: ReadonlySet<string> | undefined, b: ReadonlySet<string> | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && a.size === b.size && [...a].every((name) => b.has(name)));

function publish(next: ReadonlySet<string> | undefined): void {
  if (isSameSet(unlockedUsers, next)) return;
  unlockedUsers = next;
  listeners.forEach((listener) => listener());
}

async function probeNow(): Promise<void> {
  if (!probe || isProbing) return;
  isProbing = true;
  const epoch = answerEpoch;
  try {
    const users = await probe();
    if (epoch === answerEpoch) publish(users && new Set(users));
  } catch (error) {
    // The last answer stays: a worker being replaced, or failing to start, tells nothing of the lock
    logger.info('Could not ask the safe-storage worker which keys it holds unlocked: %s', String(error));
  } finally {
    isProbing = false;
  }
}

function syncTimer(): void {
  const shouldPoll = probe !== undefined && listeners.size > 0;
  if (shouldPoll && timer === undefined) {
    timer = setInterval(() => void probeNow(), SAFE_STORAGE_LOCK_POLL_MS);
  } else if (!shouldPoll && timer !== undefined) {
    clearInterval(timer);
    timer = undefined;
  }
}

/** Sets how the page's safe-storage worker is asked, and asks it at once. */
export function setSafeStorageLockProbe(next: SafeStorageLockProbe): void {
  probe = next;
  syncTimer();
  void probeNow();
}

/** Calls `listener` whenever the accounts held unlocked change; returns the unsubscribe. */
export function subscribeSafeStorageLock(listener: LockListener): () => void {
  listeners.add(listener);
  syncTimer();
  void probeNow();
  return () => {
    listeners.delete(listener);
    syncTimer();
  };
}

/** The accounts the page's safe-storage worker holds unlocked; undefined while that is unknown. */
export function getUnlockedSafeStorageUsers(): ReadonlySet<string> | undefined {
  return unlockedUsers;
}

/** Forgets the last answer, as after a logout: the keys it ended the session of did not lock idle. */
export function forgetSafeStorageLock(): void {
  answerEpoch += 1;
  publish(undefined);
}

import { getStorageItem, setStorageItem, StorageTTL } from '@hive/ui/lib/storage-with-ttl';

/**
 * A sign-out ends the session of every account on the origin, but hb-auth opens its SharedWorker with
 * `extendedLifetime`, so an app's worker can keep running, unlocked, after its last page closed, and
 * no page of that app hears of the sign-out. The signing-out tab starts a new sign-out epoch; a page
 * that connects a client to a worker not logged out of in the current epoch logs everyone out of it
 * first, and records it as logged out of. This module imports nothing that signs, so a page that
 * signs out without having signed loads no hb-auth.
 */
const SIGN_OUT_EPOCH_KEY = 'hbauth-sign-out-epoch';

interface SignOutEpoch {
  epoch: string;
  /** The workers (by absolute URL) logged out of since the epoch started */
  loggedOutWorkers: string[];
}

function isSignOutEpoch(value: unknown): value is SignOutEpoch {
  return (
    typeof value === 'object' &&
    value !== null &&
    'epoch' in value &&
    typeof value.epoch === 'string' &&
    'loggedOutWorkers' in value &&
    Array.isArray(value.loggedOutWorkers) &&
    value.loggedOutWorkers.every((url) => typeof url === 'string')
  );
}

function readSignOutEpoch(): SignOutEpoch | null {
  if (typeof window === 'undefined') return null;
  const stored = getStorageItem<unknown>(SIGN_OUT_EPOCH_KEY);
  return isSignOutEpoch(stored) ? stored : null;
}

const absoluteUrl = (workerUrl: string): string => new URL(workerUrl, window.location.href).href;

/** Starts a new sign-out epoch, in which no worker has been logged out of yet. */
export function advanceSignOutEpoch(): void {
  const epoch = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const advanced: SignOutEpoch = { epoch, loggedOutWorkers: [] };
  setStorageItem(SIGN_OUT_EPOCH_KEY, advanced, StorageTTL.PERMANENT);
}

/**
 * The current epoch when the worker at `workerUrl` has not been logged out of in it, to pass to
 * `recordWorkerLoggedOut` once it is; null when it has, or when no page ever signed out.
 */
export function signOutEpochToLogOut(workerUrl: string): string | null {
  const current = readSignOutEpoch();
  if (!current || current.loggedOutWorkers.includes(absoluteUrl(workerUrl))) return null;
  return current.epoch;
}

/**
 * The current epoch, to pass to `recordWorkerLoggedOut` once a worker was logged out of; null when no
 * page ever signed out.
 */
export function getSignOutEpoch(): string | null {
  return readSignOutEpoch()?.epoch ?? null;
}

/**
 * Records that the worker at `workerUrl` was logged out of in `epoch`. Nothing when another sign-out
 * started a later epoch meanwhile: the logout may predate that sign-out.
 */
export function recordWorkerLoggedOut(workerUrl: string, epoch: string): void {
  const current = readSignOutEpoch();
  const url = absoluteUrl(workerUrl);
  if (current?.epoch !== epoch || current.loggedOutWorkers.includes(url)) return;
  const recorded: SignOutEpoch = { epoch, loggedOutWorkers: [...current.loggedOutWorkers, url] };
  setStorageItem(SIGN_OUT_EPOCH_KEY, recorded, StorageTTL.PERMANENT);
}

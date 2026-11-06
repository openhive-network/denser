import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The pino logger does not load under node's type stripping: stand in a silent one.
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@hive/ui/lib/logging') return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

type SafeStorageLock = typeof import('./safe-storage-lock.ts');

let loads = 0;
/** A fresh copy of the module, without the probe or the answer an earlier test left */
const loadSafeStorageLock = (): Promise<SafeStorageLock> => import(`./safe-storage-lock.ts?test=${++loads}`);

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

/** The worker the probe asks: the accounts it holds unlocked, or undefined while the page started none */
let workerUnlocked: string[] | undefined;
const probeWorker = async () => workerUnlocked && [...workerUnlocked];

describe('safe-storage lock state', () => {
  beforeEach(() => {
    workerUnlocked = ['alice'];
    mock.timers.enable({ apis: ['setInterval'] });
  });
  afterEach(() => mock.timers.reset());

  it('is unknown until the signing stack registers its probe', async () => {
    const lock = await loadSafeStorageLock();
    const unsubscribe = lock.subscribeSafeStorageLock(() => {});
    await flush();
    assert.equal(lock.getUnlockedSafeStorageUsers(), undefined);
    unsubscribe();
  });

  it('is unknown while the page started no worker', async () => {
    workerUnlocked = undefined;
    const lock = await loadSafeStorageLock();
    lock.setSafeStorageLockProbe(probeWorker);
    lock.subscribeSafeStorageLock(() => {});
    await flush();
    assert.equal(lock.getUnlockedSafeStorageUsers(), undefined);
  });

  it('tells its listeners when the worker locks the keys idle, without a signature asking', async () => {
    const lock = await loadSafeStorageLock();
    lock.setSafeStorageLockProbe(probeWorker);
    let changes = 0;
    lock.subscribeSafeStorageLock(() => changes++);
    await flush();
    assert.deepEqual([...(lock.getUnlockedSafeStorageUsers() ?? [])], ['alice']);

    workerUnlocked = [];
    mock.timers.tick(lock.SAFE_STORAGE_LOCK_POLL_MS);
    await flush();

    assert.deepEqual([...(lock.getUnlockedSafeStorageUsers() ?? ['not asked'])], []);
    assert.equal(changes, 2);
  });

  it('does not tell its listeners of an answer that did not change', async () => {
    const lock = await loadSafeStorageLock();
    lock.setSafeStorageLockProbe(probeWorker);
    let changes = 0;
    lock.subscribeSafeStorageLock(() => changes++);
    await flush();
    mock.timers.tick(lock.SAFE_STORAGE_LOCK_POLL_MS);
    await flush();
    assert.equal(changes, 1);
  });

  it('stops asking the worker once nothing listens', async () => {
    const lock = await loadSafeStorageLock();
    let asked = 0;
    lock.setSafeStorageLockProbe(async () => {
      asked++;
      return probeWorker();
    });
    const unsubscribe = lock.subscribeSafeStorageLock(() => {});
    await flush();
    unsubscribe();
    const askedWhileListened = asked;

    mock.timers.tick(lock.SAFE_STORAGE_LOCK_POLL_MS * 3);
    await flush();
    assert.equal(asked, askedWhileListened);
  });

  it('drops, after a logout, the answer asked for before it', async () => {
    const lock = await loadSafeStorageLock();
    let answer: (users: string[]) => void = () => {};
    lock.setSafeStorageLockProbe(() => new Promise((resolve) => (answer = resolve)));
    lock.subscribeSafeStorageLock(() => {});

    lock.forgetSafeStorageLock();
    answer(['alice']);
    await flush();

    assert.equal(lock.getUnlockedSafeStorageUsers(), undefined);
  });

  it('keeps the last answer when the worker cannot be asked', async () => {
    const lock = await loadSafeStorageLock();
    let fails = false;
    lock.setSafeStorageLockProbe(async () => {
      if (fails) throw new Error('worker replaced');
      return probeWorker();
    });
    lock.subscribeSafeStorageLock(() => {});
    await flush();

    fails = true;
    mock.timers.tick(lock.SAFE_STORAGE_LOCK_POLL_MS);
    await flush();
    assert.deepEqual([...(lock.getUnlockedSafeStorageUsers() ?? [])], ['alice']);
  });
});

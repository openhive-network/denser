import { getStorageItem, setStorageItem, StorageTTL } from '@hive/ui/lib/storage-with-ttl';

/**
 * Names the state of safe storage's wallet files, which every hb-auth worker reads from IndexedDB
 * only when it starts. The apps on one origin each run their own worker, and a SharedWorker outlives
 * its pages, so a worker started before another app wrote a key keeps signing with the wallet files
 * it read, while the key aliases it reads live already list that key. Each write renews the
 * generation, and records the writing app's worker as holding it: that worker wrote the files, and
 * all of that app's pages share it, so they keep using it, unlocked. A client of any other app is
 * created with the generation in its worker URL, so one created after the write starts a worker that
 * reads the files anew.
 */
const SAFE_STORAGE_GENERATION_KEY = 'hbauth-safe-storage-generation';

interface SafeStorageGeneration {
  generation: string;
  /** The app (its base path) whose write started the generation */
  writer: string;
  /** The worker generation that app's worker URL names */
  writerWorker: string | null;
}

function isSafeStorageGeneration(value: unknown): value is SafeStorageGeneration {
  return (
    typeof value === 'object' &&
    value !== null &&
    'generation' in value &&
    typeof value.generation === 'string' &&
    'writer' in value &&
    typeof value.writer === 'string' &&
    'writerWorker' in value &&
    (value.writerWorker === null || typeof value.writerWorker === 'string')
  );
}

function readSafeStorageGeneration(): SafeStorageGeneration | null {
  const stored = getStorageItem<unknown>(SAFE_STORAGE_GENERATION_KEY);
  if (isSafeStorageGeneration(stored)) return stored;
  // A bare generation, as written before the writer was recorded: every app's worker URL named it
  if (typeof stored === 'string') return { generation: stored, writer: '', writerWorker: stored };
  return null;
}

/** The current generation; null when there is none, or localStorage cannot keep one. */
export function getSafeStorageGeneration(): string | null {
  return readSafeStorageGeneration()?.generation ?? null;
}

/**
 * The generation to name in the worker URL of the app at `basePath`: its own worker's when that app
 * wrote last, otherwise the current one. Null while there is none, which no page creates: one comes
 * only with a write, so apps loading together agree on their workers.
 */
export function getWorkerGeneration(basePath: string): string | null {
  const current = readSafeStorageGeneration();
  if (!current) return null;
  return current.writer === basePath ? current.writerWorker : current.generation;
}

/**
 * Starts a new generation, after the app at `basePath` changed the wallet files through its worker
 * named by `writerWorker`. Returns it; null when localStorage cannot keep it, and when that worker is
 * no longer the app's current one: another write renewed the generation since the app's clients were
 * created, so recording it would send the app's pages back to a worker that read older files.
 */
export function renewSafeStorageGeneration(basePath: string, writerWorker: string | null): string | null {
  if (readSafeStorageGeneration() && getWorkerGeneration(basePath) !== writerWorker) return null;
  const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const renewed: SafeStorageGeneration = { generation, writer: basePath, writerWorker };
  setStorageItem(SAFE_STORAGE_GENERATION_KEY, renewed, StorageTTL.PERMANENT);
  return getSafeStorageGeneration();
}

/** Calls `onChange` when a page in another tab renews the generation. Returns the unsubscribe. */
export function subscribeSafeStorageGeneration(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SAFE_STORAGE_GENERATION_KEY) onChange();
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

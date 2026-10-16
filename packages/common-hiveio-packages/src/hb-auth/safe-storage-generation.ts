import { getStorageItem, setStorageItem, StorageTTL } from '@hive/ui/lib/storage-with-ttl';

/**
 * Names the state of safe storage's wallet files, which every hb-auth worker reads from IndexedDB
 * only when it starts. The apps on one origin each run their own worker, and a SharedWorker outlives
 * its pages, so a worker started before another one wrote a key keeps signing with the wallet files
 * it read, while the key aliases it reads live already list that key. Each write renews the
 * generation; a client is created with the generation in its worker URL, so one created after a write
 * starts a worker that reads the files anew.
 */
const SAFE_STORAGE_GENERATION_KEY = 'hbauth-safe-storage-generation';

/** The current generation; null when there is none, or localStorage cannot keep one. */
export function getSafeStorageGeneration(): string | null {
  return getStorageItem<string>(SAFE_STORAGE_GENERATION_KEY);
}

/** Starts a new generation, after the wallet files changed; null when localStorage cannot keep it. */
export function renewSafeStorageGeneration(): string | null {
  const generation = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  setStorageItem(SAFE_STORAGE_GENERATION_KEY, generation, StorageTTL.PERMANENT);
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

/**
 * Names the state of safe storage's wallet files, which every hb-auth worker reads from IndexedDB
 * only when it starts. The apps on one origin each run their own worker, and a SharedWorker outlives
 * its pages, so a worker started before another app wrote a key keeps signing with the wallet files
 * it read, while the key aliases it reads live already list that key. Each write renews the
 * generation, and records the writing app's worker as holding it: that worker wrote the files, and
 * all of that app's pages share it, so they keep using it, unlocked. A client of any other app is
 * created with the generation in its worker URL, so one created after the write starts a worker that
 * reads the files anew.
 *
 * The generation itself is kept by safe-storage-generation.ts; this module only names where, so a
 * page that just listens for other tabs' writes loads none of that.
 */
export const SAFE_STORAGE_GENERATION_KEY = 'hbauth-safe-storage-generation';

/** Calls `onChange` when a page in another tab renews the generation. Returns the unsubscribe. */
export function subscribeSafeStorageGeneration(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === SAFE_STORAGE_GENERATION_KEY) onChange();
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

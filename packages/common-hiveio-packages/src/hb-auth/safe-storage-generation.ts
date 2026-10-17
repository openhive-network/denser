import { getStorageItem, removeStorageItem, setStorageItem, StorageTTL } from '@hive/ui/lib/storage-with-ttl';

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

/**
 * The apps (their base paths) whose operations are writing safe storage's wallet files, while they
 * do, each with the time its mark expires, in case its page closed meanwhile: the other apps start a
 * worker for the generation once every one of them ended.
 */
const SAFE_STORAGE_WRITING_KEY = 'hbauth-safe-storage-writing';
const SAFE_STORAGE_WRITING_TTL = 10_000;

type WritingApps = Record<string, number>;
/** How long the generation has to stay unchanged before the other apps start a worker for it */
const SAFE_STORAGE_QUIET_PERIOD = 150;

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

/** The apps marked as writing, without those whose marks expired */
function readWritingApps(): WritingApps {
  const stored = getStorageItem<unknown>(SAFE_STORAGE_WRITING_KEY);
  // A bare base path, as marked before each app was recorded on its own, expires on its own
  if (typeof stored !== 'object' || stored === null) return {};
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(stored).filter(
      (entry): entry is [string, number] => typeof entry[1] === 'number' && entry[1] > now
    )
  );
}

function storeWritingApps(apps: WritingApps): void {
  if (Object.keys(apps).length) setStorageItem(SAFE_STORAGE_WRITING_KEY, apps, SAFE_STORAGE_WRITING_TTL);
  else removeStorageItem(SAFE_STORAGE_WRITING_KEY);
}

/** Records that an operation of the app at `basePath` writes the wallet files, until it ends */
export function markSafeStorageWriting(basePath: string): void {
  storeWritingApps({ ...readWritingApps(), [basePath]: Date.now() + SAFE_STORAGE_WRITING_TTL });
}

/** Records that the writing operation of the app at `basePath` ended, keeping the other apps' marks */
export function endSafeStorageWriting(basePath: string): void {
  const { [basePath]: ended, ...others } = readWritingApps();
  if (ended !== undefined) storeWritingApps(others);
}

function isAnotherAppWriting(basePath: string): boolean {
  return Object.keys(readWritingApps()).some((app) => app !== basePath);
}

/**
 * Resolves once the generation settled for the app at `basePath`: it stayed unchanged for a quiet
 * period, and no other app's operation writes the wallet files, unless `isUrgent` says not to wait
 * for that.
 */
export async function whenSafeStorageSettles(basePath: string, isUrgent: () => boolean): Promise<void> {
  let seen = getSafeStorageGeneration();
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, SAFE_STORAGE_QUIET_PERIOD));
    const latest = getSafeStorageGeneration();
    if (latest === seen && (isUrgent() || !isAnotherAppWriting(basePath))) return;
    seen = latest;
  }
}

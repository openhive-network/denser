import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The pino logger does not load under node's type stripping: stand in a silent one.
// Repo-style extensionless imports need the `.ts` spelled out for node.
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
const STORAGE_WITH_TTL_URL = new URL('../../../ui/lib/storage-with-ttl.ts', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './logging') return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
    if (specifier === '@hive/ui/lib/storage-with-ttl') return { url: STORAGE_WITH_TTL_URL, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

class MemoryStorage {
  private items = new Map<string, string>();
  full = false;
  get length() {
    return this.items.size;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.full) throw new Error('QuotaExceededError');
    this.items.set(key, String(value));
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  clear() {
    this.items.clear();
  }
}

/** A `storage` event, as another tab's write fires it */
function storageEvent(key: string): Event {
  return Object.assign(new Event('storage'), { key });
}

const storage = new MemoryStorage();
const fakeWindow = Object.assign(new EventTarget(), { localStorage: storage });
Object.assign(globalThis, { window: fakeWindow });

const { getSafeStorageGeneration, renewSafeStorageGeneration, subscribeSafeStorageGeneration } = await import(
  './safe-storage-generation.ts'
);

describe('safe storage generation', () => {
  beforeEach(() => {
    storage.clear();
    storage.full = false;
  });

  it('is null until renewed, then the renewed one', () => {
    assert.equal(getSafeStorageGeneration(), null);

    const generation = renewSafeStorageGeneration();

    assert.equal(typeof generation, 'string');
    assert.equal(getSafeStorageGeneration(), generation);
  });

  it('changes on every renewal', () => {
    const first = renewSafeStorageGeneration();
    const second = renewSafeStorageGeneration();

    assert.notEqual(first, second);
    assert.equal(getSafeStorageGeneration(), second);
  });

  it('stays null when localStorage cannot keep it, so clients are not replaced on every call', () => {
    storage.full = true;

    assert.equal(renewSafeStorageGeneration(), null);
    assert.equal(getSafeStorageGeneration(), null);
  });

  it('tells subscribers of another tab renewing it, until they unsubscribe', () => {
    let calls = 0;
    const unsubscribe = subscribeSafeStorageGeneration(() => calls++);
    renewSafeStorageGeneration();
    const generationKey = storage.key(0) ?? '';

    fakeWindow.dispatchEvent(storageEvent('postData-new-alice'));
    fakeWindow.dispatchEvent(storageEvent(generationKey));
    unsubscribe();
    fakeWindow.dispatchEvent(storageEvent(generationKey));

    assert.equal(calls, 1);
  });
});

import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The pino logger does not load under node's type stripping: stand in a silent one
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './logging') return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

class MemoryStorage {
  private items = new Map<string, string>();
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
    this.items.set(key, String(value));
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  clear() {
    this.items.clear();
  }
  keys() {
    return [...this.items.keys()].sort();
  }
}

const storage = new MemoryStorage();
Object.assign(globalThis, { window: { localStorage: storage } });

const { cleanupExpiredItems, setStorageItem, StorageTTL } = await import('./storage-with-ttl.ts');

describe('cleanupExpiredItems', () => {
  beforeEach(() => storage.clear());

  it('removes the retired passkey unlock failure counts, unexpired or written without a TTL', () => {
    setStorageItem('passkey-unlock-failures-alice', 2, StorageTTL.UI_STATE);
    storage.setItem('passkey-unlock-failures-bob', '1');
    setStorageItem('passkey-dismissed-alice', true, StorageTTL.PERMANENT);
    setStorageItem('replyTo-alice-post', 'draft', StorageTTL.DRAFT);

    const removed = cleanupExpiredItems();

    assert.equal(removed, 2);
    assert.deepEqual(storage.keys(), ['passkey-dismissed-alice', 'replyTo-alice-post']);
  });
});

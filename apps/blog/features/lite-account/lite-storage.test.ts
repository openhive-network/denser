import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Node resolves neither the `@ui/*` alias nor the repo's extensionless relative imports, and the
// pino logger does not load under type stripping: point them at the sources, and a silent logger.
const UI_LIB = new URL('../../../../packages/ui/lib/', import.meta.url);
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './logging') return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
    if (specifier === './storage-with-ttl') return nextResolve(new URL('storage-with-ttl.ts', UI_LIB).href, context);
    if (specifier.startsWith('@ui/lib/')) return nextResolve(new URL(`${specifier.slice('@ui/lib/'.length)}.ts`, UI_LIB).href, context);
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
}

class FakeStorageEvent extends Event {
  readonly key: string | null;
  constructor(type: string, init: { key?: string | null }) {
    super(type);
    this.key = init.key ?? null;
  }
}

const storage = new MemoryStorage();
const fakeWindow = Object.assign(new EventTarget(), { localStorage: storage });
Object.assign(globalThis, { window: fakeWindow, localStorage: storage, StorageEvent: FakeStorageEvent });

const { forgetLiteAccount, LITE_CLIENT_ID_STORAGE_KEY, LITE_IDENTITY_STORAGE_KEY } = await import('./lite-storage.ts');
const { setStorageItem, StorageTTL } = await import('../../../../packages/ui/lib/storage-with-ttl.ts');

const changed: string[] = [];
fakeWindow.addEventListener('storage', (event) => {
  if (event instanceof FakeStorageEvent && event.key) changed.push(event.key);
});

describe('forgetLiteAccount', () => {
  beforeEach(() => {
    storage.clear();
    changed.length = 0;
  });

  it('removes the identity, drafts, queue and sign-in mark, and tells this tab', () => {
    const liteKeys = [
      LITE_IDENTITY_STORAGE_KEY,
      'lite-replyTo-/did:lite:warm-zebra-201/re-lite-test-478380rd5v',
      'lite-replyTo-/test-gateway-1/re-lite-test-478380rd5v',
      'lite-postData-new',
      'lite-root-queue',
      'lite-sign-in-reply'
    ];
    liteKeys.forEach((key) => setStorageItem(key, { stored: key }, StorageTTL.DRAFT));

    forgetLiteAccount();

    liteKeys.forEach((key) => assert.equal(storage.getItem(key), null, key));
    assert.deepEqual([...changed].sort(), [...liteKeys].sort());
  });

  it('keeps the client id and every key outside the lite flows', () => {
    setStorageItem(LITE_IDENTITY_STORAGE_KEY, { name: 'lite-smoke-1016' }, StorageTTL.PERMANENT);
    setStorageItem(LITE_CLIENT_ID_STORAGE_KEY, 'device-1', StorageTTL.PERMANENT);
    setStorageItem('replyTo-/gtg/some-post-gtg', 'own draft', StorageTTL.DRAFT);
    setStorageItem('postData-new-gtg', { title: 'own' }, StorageTTL.DRAFT);

    forgetLiteAccount();

    assert.equal(storage.getItem(LITE_IDENTITY_STORAGE_KEY), null);
    assert.notEqual(storage.getItem(LITE_CLIENT_ID_STORAGE_KEY), null);
    assert.notEqual(storage.getItem('replyTo-/gtg/some-post-gtg'), null);
    assert.notEqual(storage.getItem('postData-new-gtg'), null);
    assert.deepEqual(changed, [LITE_IDENTITY_STORAGE_KEY]);
  });
});

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The pino logger does not load under node's type stripping: stand in a silent one.
// Repo-style extensionless relative imports need the `.ts` spelled out for node.
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './logging') return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
    if (specifier === './storage-with-ttl') return nextResolve('./storage-with-ttl.ts', context);
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
  readonly oldValue: string | null;
  readonly newValue: string | null;
  constructor(type: string, init: { key?: string | null; oldValue?: string | null; newValue?: string | null }) {
    super(type);
    this.key = init.key ?? null;
    this.oldValue = init.oldValue ?? null;
    this.newValue = init.newValue ?? null;
  }
}

const storage = new MemoryStorage();
const fakeWindow = Object.assign(new EventTarget(), { localStorage: storage });
Object.assign(globalThis, { window: fakeWindow, StorageEvent: FakeStorageEvent });

const { setStorageItemAndNotify, removeStorageItemAndNotify } = await import('./storage-with-ttl-notify.ts');
const { getStorageItem } = await import('./storage-with-ttl.ts');

const KEY = 'postData-new-alice';
const HOUR = 60 * 60 * 1000;

const events: FakeStorageEvent[] = [];
fakeWindow.addEventListener('storage', (event) => {
  assert.ok(event instanceof FakeStorageEvent);
  events.push(event);
});

describe('storage-with-ttl-notify', () => {
  beforeEach(() => {
    storage.clear();
    events.length = 0;
    mock.timers.enable({ apis: ['Date'], now: 1_000_000 });
  });

  afterEach(() => {
    mock.timers.reset();
  });

  it('dispatches a same-tab storage event for a write by default', () => {
    setStorageItemAndNotify(KEY, { title: 'draft' }, HOUR);

    assert.equal(events.length, 1);
    assert.equal(events[0].key, KEY);
    assert.equal(events[0].oldValue, null);
    assert.equal(events[0].newValue, storage.getItem(KEY));
    assert.deepEqual(getStorageItem(KEY), { title: 'draft' });
  });

  it('writes without dispatching when dispatchSameTab is false', () => {
    setStorageItemAndNotify(KEY, { title: 'draft' }, HOUR, { dispatchSameTab: false });

    assert.equal(events.length, 0);
    assert.deepEqual(getStorageItem(KEY), { title: 'draft' });
  });

  it('honours the TTL of a write that does not dispatch', () => {
    setStorageItemAndNotify(KEY, 'body', HOUR, { dispatchSameTab: false });

    mock.timers.tick(HOUR);
    assert.equal(getStorageItem(KEY), 'body');
    mock.timers.tick(1);
    assert.equal(getStorageItem(KEY), null);
  });

  it('dispatches a removal by default, with the removed value as oldValue', () => {
    setStorageItemAndNotify(KEY, 'body', HOUR, { dispatchSameTab: false });
    const stored = storage.getItem(KEY);

    removeStorageItemAndNotify(KEY);

    assert.equal(storage.getItem(KEY), null);
    assert.equal(events.length, 1);
    assert.equal(events[0].oldValue, stored);
    assert.equal(events[0].newValue, null);
  });

  it('removes without dispatching when dispatchSameTab is false', () => {
    setStorageItemAndNotify(KEY, 'body', HOUR, { dispatchSameTab: false });

    removeStorageItemAndNotify(KEY, { dispatchSameTab: false });

    assert.equal(storage.getItem(KEY), null);
    assert.equal(events.length, 0);
  });
});

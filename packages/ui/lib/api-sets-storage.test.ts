import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The legacy node picks `hive-chain-service` reads, set per test; its real module loads wax.
const HIVE_CHAIN_SERVICE_STUB =
  'data:text/javascript,export const hiveChainService = {' +
  ' getLegacyEndpointChoices: () => globalThis.legacyEndpointChoices ?? {},' +
  ' clearLegacyEndpointChoices: () => { globalThis.legacyEndpointChoices = {}; } };';
// The pino logger does not load under node's type stripping: stand in a silent one.
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
const ALIASES: Record<string, string> = {
  '@ui/config/api-set-ids': new URL('../config/api-set-ids.ts', import.meta.url).href,
  '@ui/config/api-sets': new URL('../config/api-sets.ts', import.meta.url).href,
  '@ui/lib/api-sets-choices': new URL('./api-sets-choices.ts', import.meta.url).href,
  '@ui/lib/storage-with-ttl': new URL('./storage-with-ttl.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@transaction/lib/hive-chain-service') {
      return { url: HIVE_CHAIN_SERVICE_STUB, shortCircuit: true };
    }
    if (specifier === './logging') return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
    const alias = ALIASES[specifier];
    return nextResolve(alias ?? specifier, context);
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

/** A `document` whose cookie keeps what the page was loaded with and records every write. */
const fakeDocument = { loadedCookie: '', cookieWrites: [] as string[] };
Object.defineProperty(fakeDocument, 'cookie', {
  get: () => fakeDocument.loadedCookie,
  set: (assignment: string) => fakeDocument.cookieWrites.push(assignment)
});
const storage = new MemoryStorage();
Object.assign(globalThis, { window: { localStorage: storage }, document: fakeDocument });

const { API_SETS_STORAGE_KEY } = await import('../config/api-set-ids.ts');
const { getStorageItem, setStorageItem, StorageTTL } = await import('./storage-with-ttl.ts');
const { storedApiSetChoices } = await import('./api-sets-choices.ts');
const { createApiSetsSelectionStorage, migrateApiSetsSelection } = await import('./api-sets-storage.ts');

const HIVE_BLOG = 'https://api.hive.blog';
const SYNCAD = 'https://api.syncad.com';
const ANYX = 'https://anyx.io';
const CATALOG = [HIVE_BLOG, SYNCAD, ANYX];

const selectionOf = (choices: Record<string, string>): string => {
  const params = new URLSearchParams({ v: '1' });
  for (const [setId, node] of Object.entries(choices)) params.set(`s.${setId}`, node);
  return params.toString();
};

const setLegacyChoices = (choices: { apiNode?: string; aiNode?: string }): void => {
  Reflect.set(globalThis, 'legacyEndpointChoices', choices);
};

describe('the browser keeping the per-set node choices', () => {
  beforeEach(() => {
    storage.clear();
    fakeDocument.loadedCookie = '';
    fakeDocument.cookieWrites.length = 0;
    setLegacyChoices({});
  });

  it('loads a choice stored before the cookie was retired from localStorage, not from the cookie', () => {
    const stored = selectionOf({ core: ANYX });
    setStorageItem(API_SETS_STORAGE_KEY, stored, StorageTTL.PERMANENT);
    fakeDocument.loadedCookie = `api-sets=${encodeURIComponent(selectionOf({ core: SYNCAD }))}`;

    assert.equal(createApiSetsSelectionStorage(CATALOG).load(), stored);
    assert.deepEqual(storedApiSetChoices(), { core: ANYX });

    storage.clear();
    assert.equal(createApiSetsSelectionStorage(CATALOG).load(), null);
    assert.deepEqual(storedApiSetChoices(), {});
  });

  it('saves a choice to localStorage alone, naming its node by URL', () => {
    createApiSetsSelectionStorage(CATALOG).save('v=1&s.bridge=2');

    assert.equal(getStorageItem(API_SETS_STORAGE_KEY), selectionOf({ bridge: ANYX }));
    assert.deepEqual(fakeDocument.cookieWrites, []);
  });

  it('migrates a node picked before API sets existed into localStorage, for core and bridge', () => {
    setLegacyChoices({ apiNode: ANYX, aiNode: SYNCAD });

    migrateApiSetsSelection(CATALOG);

    assert.deepEqual(storedApiSetChoices(), { core: ANYX, bridge: ANYX, hivesense: SYNCAD });
    assert.deepEqual(fakeDocument.cookieWrites, []);
  });

  it('keeps per-set choices already stored over a legacy pick', () => {
    const stored = selectionOf({ core: SYNCAD });
    setStorageItem(API_SETS_STORAGE_KEY, stored, StorageTTL.PERMANENT);
    setLegacyChoices({ apiNode: ANYX });

    migrateApiSetsSelection(CATALOG);

    assert.equal(getStorageItem(API_SETS_STORAGE_KEY), stored);
  });

  it('stores nothing for a legacy pick of a node outside the catalog', () => {
    setLegacyChoices({ apiNode: 'http://localhost:8299' });

    migrateApiSetsSelection(CATALOG);

    assert.equal(getStorageItem(API_SETS_STORAGE_KEY), null);
  });
});

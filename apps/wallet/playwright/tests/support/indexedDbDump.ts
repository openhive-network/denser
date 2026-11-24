import type { Page } from '@playwright/test';

/**
 * Every IndexedDB database of a page's origin as JSON, for a fixture recorded once and restored in
 * a fresh browser context. Keys and values are stored tagged: a `{ $idb: 'Date' }` or binary
 * `{ $idb: 'Uint8Array' }` (any typed array, or `ArrayBuffer`) stands for the value it encodes.
 */
export interface IndexedDbDump {
  databases: DatabaseDump[];
}

interface DatabaseDump {
  name: string;
  version: number;
  stores: StoreDump[];
}

interface StoreDump {
  name: string;
  keyPath: string | string[] | null;
  autoIncrement: boolean;
  indexes: { name: string; keyPath: string | string[]; unique: boolean; multiEntry: boolean }[];
  records: { key: unknown; value: unknown }[];
}

/** Reads every IndexedDB database of `page`'s origin; rejects on a value JSON cannot hold */
export const dumpIndexedDb = (page: Page): Promise<IndexedDbDump> =>
  page.evaluate(async () => {
    const BINARY_TYPES = [
      'ArrayBuffer',
      'Int8Array',
      'Uint8Array',
      'Uint8ClampedArray',
      'Int16Array',
      'Uint16Array',
      'Int32Array',
      'Uint32Array',
      'Float32Array',
      'Float64Array'
    ];
    const encode = (value: unknown): unknown => {
      if (value === null || typeof value !== 'object') return value;
      if (value instanceof Date) return { $idb: 'Date', time: value.getTime() };
      if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
        const type = value.constructor.name;
        if (!BINARY_TYPES.includes(type)) throw new Error(`Cannot record a ${type}`);
        const bytes =
          value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        return { $idb: type, base64: btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')) };
      }
      if (Array.isArray(value)) return value.map(encode);
      if (Object.getPrototypeOf(value) !== Object.prototype) {
        throw new Error(`Cannot record a ${Object.prototype.toString.call(value)}`);
      }
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, encode(entry)]));
    };
    const settle = <T>(request: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    const readStore = async (db: IDBDatabase, name: string) => {
      const store = db.transaction(name, 'readonly').objectStore(name);
      const [keys, values] = await Promise.all([settle(store.getAllKeys()), settle(store.getAll())]);
      return {
        name,
        keyPath: store.keyPath,
        autoIncrement: store.autoIncrement,
        indexes: Array.from(store.indexNames, (indexName) => {
          const { keyPath, unique, multiEntry } = store.index(indexName);
          return { name: indexName, keyPath, unique, multiEntry };
        }),
        records: keys.map((key, at) => ({ key: encode(key), value: encode(values[at]) }))
      };
    };

    const databases = [];
    for (const { name } of await indexedDB.databases()) {
      if (!name) continue;
      const db = await settle(indexedDB.open(name));
      try {
        const stores = [];
        for (const storeName of Array.from(db.objectStoreNames)) stores.push(await readStore(db, storeName));
        databases.push({ name, version: db.version, stores });
      } finally {
        db.close();
      }
    }
    return { databases: databases.sort((a, b) => a.name.localeCompare(b.name)) };
  });

/**
 * Writes `dump` into IndexedDB of `page`'s origin, which must not hold any of its databases yet.
 * Load a page of that origin first that opens none of them.
 */
export const restoreIndexedDb = (page: Page, dump: IndexedDbDump): Promise<void> =>
  page.evaluate(async ({ databases }) => {
    const decode = (value: unknown): unknown => {
      if (value === null || typeof value !== 'object') return value;
      if (Array.isArray(value)) return value.map(decode);
      const entries: Record<string, unknown> = Object.fromEntries(Object.entries(value));
      if (entries.$idb === 'Date') return new Date(Number(entries.time));
      if (typeof entries.$idb === 'string') {
        const bytes = Uint8Array.from(atob(String(entries.base64)), (char) => char.charCodeAt(0));
        if (entries.$idb === 'ArrayBuffer') return bytes.buffer;
        const view: unknown = Reflect.get(globalThis, entries.$idb);
        if (typeof view !== 'function') throw new Error(`Cannot restore a ${entries.$idb}`);
        return Reflect.construct(view, [bytes.buffer]);
      }
      return Object.fromEntries(Object.entries(entries).map(([key, entry]) => [key, decode(entry)]));
    };
    const isKey = (key: unknown): key is IDBValidKey =>
      ['number', 'string'].includes(typeof key) ||
      key instanceof Date ||
      key instanceof ArrayBuffer ||
      ArrayBuffer.isView(key) ||
      (Array.isArray(key) && key.every(isKey));
    const createStores = (db: IDBDatabase, stores: StoreDump[]) => {
      for (const { name, keyPath, autoIncrement, indexes, records } of stores) {
        const store = db.createObjectStore(name, { keyPath, autoIncrement });
        for (const index of indexes) store.createIndex(index.name, index.keyPath, index);
        for (const record of records) {
          const value = decode(record.value);
          if (keyPath !== null) {
            store.put(value);
            continue;
          }
          const key = decode(record.key);
          if (!isKey(key)) throw new Error(`Cannot restore the key ${JSON.stringify(record.key)} of ${db.name}/${name}`);
          store.put(value, key);
        }
      }
    };
    const restoreDatabase = ({ name, version, stores }: DatabaseDump) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(name, version);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = () => {
          try {
            createStores(request.result, stores);
          } catch (error) {
            reject(error);
            request.transaction?.abort();
          }
        };
        request.onsuccess = () => {
          request.result.close();
          resolve();
        };
      });
    const existing = new Set((await indexedDB.databases()).map((db) => db.name));
    const present = databases.filter(({ name }) => existing.has(name)).map(({ name }) => name);
    if (present.length) throw new Error(`IndexedDB holds ${present.join(', ')} already`);
    for (const database of databases) await restoreDatabase(database);
  }, dump);

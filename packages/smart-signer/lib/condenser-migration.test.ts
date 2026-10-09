import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// The pino logger does not load under node's type stripping: stand in a silent one.
const SILENT_LOGGER_MODULE =
  'data:text/javascript,const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop });';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier !== '@hive/ui/lib/logging') return nextResolve(specifier, context);
    return { url: SILENT_LOGGER_MODULE, shortCircuit: true };
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
  keys() {
    return [...this.items.keys()].sort();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });

const { parseAutopost2, readCondenserLanguage, removeCondenserKeys, isAlreadyMigrated, markMigrated } =
  await import('./condenser-migration.ts');

const toHex = (text: string) => Buffer.from(text, 'utf8').toString('hex');

beforeEach(() => {
  for (const key of storage.keys()) storage.removeItem(key);
});

describe('parseAutopost2', () => {
  it('decodes the username, posting key and Keychain flag', () => {
    storage.setItem('autopost2', toHex(['alice', '5Kwif', 'memo', 'STMpub', 'true'].join('\t')));
    assert.deepEqual(parseAutopost2(), { username: 'alice', postingWif: '5Kwif', loginWithKeychain: true });
  });

  it('rejects an invalid account name', () => {
    storage.setItem('autopost2', toHex(['Alice!', '5Kwif'].join('\t')));
    assert.equal(parseAutopost2(), null);
  });

  it('returns null without autopost2', () => {
    assert.equal(parseAutopost2(), null);
  });
});

describe('readCondenserLanguage', () => {
  it('reads the JSON-encoded value of a supported language', () => {
    storage.setItem('language', JSON.stringify('pl'));
    assert.equal(readCondenserLanguage(['en', 'pl']), 'pl');
  });

  it('falls back to the raw value when it is not JSON', () => {
    storage.setItem('language', 'pl');
    assert.equal(readCondenserLanguage(['en', 'pl']), 'pl');
  });

  it('ignores an unsupported language', () => {
    storage.setItem('language', JSON.stringify('xx'));
    assert.equal(readCondenserLanguage(['en', 'pl']), null);
  });
});

describe('removeCondenserKeys', () => {
  it('removes the common keys and the app-specific keys and patterns, keeping the rest', () => {
    for (const key of [
      'autopost2',
      'autopost',
      'saveLogin',
      'bump',
      'language',
      'alice_previous_owner_authority_last_valid_time',
      'replyEditorData-rte',
      'showEditor-x',
      'votesValues'
    ]) {
      storage.setItem(key, '1');
    }

    removeCondenserKeys(['replyEditorData-rte'], [/^showEditor-/]);

    assert.deepEqual(storage.keys(), ['votesValues']);
  });
});

describe('migration flag', () => {
  it('is read and written under the profile key', () => {
    const profile = {
      migratedFlagKey: 'condenser-test-migrated',
      logLabel: 'test',
      migrateSettings: () => {},
      cleanupWithoutLogin: () => {},
      cleanup: () => {}
    };
    assert.equal(isAlreadyMigrated(profile), false);
    markMigrated(profile);
    assert.equal(storage.getItem('condenser-test-migrated'), '1');
    assert.equal(isAlreadyMigrated(profile), true);
  });
});

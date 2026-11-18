import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readAvatarVersion, recordAvatarVersion, subscribeAvatarVersions } from './avatar-version.ts';

class MemoryStorage {
  items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
}

const globals = globalThis as { window?: { sessionStorage: MemoryStorage } };
let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  globals.window = { sessionStorage: storage };
});

afterEach(() => {
  delete globals.window;
});

describe('avatar version store', () => {
  it('reads back the version recorded for a username', () => {
    recordAvatarVersion('alice', 1763500000000);
    assert.equal(readAvatarVersion('alice'), 1763500000000);
  });

  it('records the current time by default', () => {
    const before = Date.now();
    recordAvatarVersion('alice');
    const version = readAvatarVersion('alice');
    assert.ok(version !== undefined && version >= before && version <= Date.now());
  });

  it('has no version for a username that was not recorded', () => {
    recordAvatarVersion('alice', 1763500000000);
    assert.equal(readAvatarVersion('bob'), undefined);
  });

  it('keeps versions in session storage, so a reload in the tab still reads them', () => {
    recordAvatarVersion('alice', 1763500000000);
    assert.deepEqual([...storage.items], [['avatar-version:alice', '1763500000000']]);
  });

  it('ignores a stored value that is not a version', () => {
    storage.setItem('avatar-version:alice', 'garbage');
    assert.equal(readAvatarVersion('alice'), undefined);
  });

  it('reads and records nothing on the server', () => {
    delete globals.window;
    recordAvatarVersion('alice', 1763500000000);
    assert.equal(readAvatarVersion('alice'), undefined);
    assert.equal(storage.items.size, 0);
  });

  it('notifies subscribers of a recorded version until they unsubscribe', () => {
    let calls = 0;
    const unsubscribe = subscribeAvatarVersions(() => calls++);
    recordAvatarVersion('alice', 1);
    unsubscribe();
    recordAvatarVersion('alice', 2);
    assert.equal(calls, 1);
  });
});

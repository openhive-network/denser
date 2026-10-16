import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearAccountCredentials,
  clearAllCredentials,
  googleEncryptionKeyWifCredentialKey,
  googleRefreshTokenCredentialKey,
  hiveAuthCredentialKey,
  readCredential,
  storedWifKeyTypes,
  wifCredentialKey
} from './credential-storage.ts';

/** In-memory `Storage`, as localStorage behaves. */
class StubStorage implements Storage {
  private readonly items = new Map<string, string>();

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  keys(): string[] {
    return [...this.items.keys()].sort();
  }
}

const hiveAuthData = (username: string, token: string) => JSON.stringify({ username, token, expire: 1, key: 'k' });
const ownedBy = (username: string) => (legacyValue: string) => JSON.parse(legacyValue).username === username;
const neverLegacyOwner = () => false;

describe('readCredential', () => {
  it('keeps one credential per account: two HiveAuth accounts each read their own', () => {
    const storage = new StubStorage();
    storage.setItem(hiveAuthCredentialKey('alice').key, hiveAuthData('alice', 'token-a'));
    storage.setItem(hiveAuthCredentialKey('bob').key, hiveAuthData('bob', 'token-b'));

    assert.equal(readCredential(storage, hiveAuthCredentialKey('alice'), neverLegacyOwner), hiveAuthData('alice', 'token-a'));
    assert.equal(readCredential(storage, hiveAuthCredentialKey('bob'), neverLegacyOwner), hiveAuthData('bob', 'token-b'));
  });

  it('moves the shared legacy entry to the account it belongs to, on that account\'s first read', () => {
    const storage = new StubStorage();
    storage.setItem('hiveAuthData', hiveAuthData('alice', 'token-a'));

    assert.equal(readCredential(storage, hiveAuthCredentialKey('bob'), ownedBy('bob')), null);
    assert.deepEqual(storage.keys(), ['hiveAuthData']);

    assert.equal(readCredential(storage, hiveAuthCredentialKey('alice'), ownedBy('alice')), hiveAuthData('alice', 'token-a'));
    assert.deepEqual(storage.keys(), ['hiveAuthData.alice']);
  });

  it('prefers the account\'s own credential over the legacy entry', () => {
    const storage = new StubStorage();
    storage.setItem('google_refresh_token', 'legacy-token');
    storage.setItem(googleRefreshTokenCredentialKey('alice').key, 'alice-token');

    assert.equal(readCredential(storage, googleRefreshTokenCredentialKey('alice'), () => true), 'alice-token');
    assert.equal(storage.getItem('google_refresh_token'), 'legacy-token');
  });
});

describe('clearAccountCredentials', () => {
  it('removes every credential of the account and leaves the other accounts\' usable', () => {
    const storage = new StubStorage();
    for (const username of ['alice', 'alice2']) {
      storage.setItem(wifCredentialKey(username, 'posting'), '"wif"');
      storage.setItem(wifCredentialKey(username, 'active'), '"wif"');
      storage.setItem(hiveAuthCredentialKey(username).key, hiveAuthData(username, 'token'));
      storage.setItem(googleRefreshTokenCredentialKey(username).key, 'refresh');
      storage.setItem(googleEncryptionKeyWifCredentialKey(username).key, 'wif');
    }
    storage.setItem('user', '{}');

    clearAccountCredentials(storage, 'alice');

    assert.deepEqual(storage.keys(), [
      'gdrive_encryption_key_wif.alice2',
      'google_refresh_token.alice2',
      'hiveAuthData.alice2',
      'user',
      'wif.alice2@active',
      'wif.alice2@posting'
    ]);
    assert.equal(readCredential(storage, hiveAuthCredentialKey('alice2'), neverLegacyOwner), hiveAuthData('alice2', 'token'));
  });
});

describe('clearAllCredentials', () => {
  it('removes the credentials of every account and the legacy entries, and nothing else', () => {
    const storage = new StubStorage();
    storage.setItem(wifCredentialKey('alice', 'posting'), '"wif"');
    storage.setItem(wifCredentialKey('bob', 'owner'), '"wif"');
    storage.setItem(hiveAuthCredentialKey('bob').key, hiveAuthData('bob', 'token'));
    storage.setItem(googleRefreshTokenCredentialKey('carol').key, 'refresh');
    storage.setItem('hiveAuthData', hiveAuthData('dave', 'token'));
    storage.setItem('google_refresh_token', 'refresh');
    storage.setItem('gdrive_encryption_key_wif', 'wif');
    storage.setItem('user', '{}');
    storage.setItem('accounts', '[]');

    clearAllCredentials(storage);

    assert.deepEqual(storage.keys(), ['accounts', 'user']);
  });
});

describe('storedWifKeyTypes', () => {
  it('finds one key stored as both the posting and the active key', () => {
    const storage = new StubStorage();
    storage.setItem(wifCredentialKey('alice', 'posting'), JSON.stringify('shared-wif'));
    storage.setItem(wifCredentialKey('alice', 'active'), JSON.stringify('shared-wif'));

    assert.deepEqual(storedWifKeyTypes(storage, 'alice', 'posting'), ['posting', 'active']);
    assert.deepEqual(storedWifKeyTypes(storage, 'alice', 'active'), ['posting', 'active']);
  });

  it('keeps distinct keys to their own key types', () => {
    const storage = new StubStorage();
    storage.setItem(wifCredentialKey('alice', 'posting'), JSON.stringify('posting-wif'));
    storage.setItem(wifCredentialKey('alice', 'active'), JSON.stringify('active-wif'));

    assert.deepEqual(storedWifKeyTypes(storage, 'alice', 'posting'), ['posting']);
    assert.deepEqual(storedWifKeyTypes(storage, 'alice', 'active'), ['active']);
  });

  it('finds nothing when the key type has no stored key, and ignores other accounts', () => {
    const storage = new StubStorage();
    storage.setItem(wifCredentialKey('alice', 'posting'), JSON.stringify('shared-wif'));
    storage.setItem(wifCredentialKey('bob', 'active'), JSON.stringify('shared-wif'));

    assert.deepEqual(storedWifKeyTypes(storage, 'alice', 'active'), []);
    assert.deepEqual(storedWifKeyTypes(storage, 'alice', 'posting'), ['posting']);
  });
});

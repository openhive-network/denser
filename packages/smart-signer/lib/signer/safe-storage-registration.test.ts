import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { AuthUser, KeyAuthorityType } from '@hiveio/hb-auth';
import {
  registerAddedSafeStorageKey,
  registerSafeStorageKey,
  type SafeStorageClient,
  type SharedKeyLookup
} from './safe-storage-registration.ts';

type UserSettings = NonNullable<Awaited<ReturnType<SafeStorageClient['getUserSettings']>>>;

const USERNAME = 'alice';
const AUTHORITY_ACCOUNT = 'bob';

/**
 * hb-auth's client as far as registering goes: keeps what was registered, with its Direct
 * Authority Mode, and records the account in authority for a key registered non-strict.
 */
class FakeSafeStorage implements SafeStorageClient {
  readonly registered: { keyType: KeyAuthorityType; wif: string; password: string; strict: boolean }[] = [];
  settings: UserSettings | null = null;
  failingKeyTypes: KeyAuthorityType[] = [];

  async register(_username: string, password: string, wif: string, keyType: KeyAuthorityType, strict = true) {
    if (this.failingKeyTypes.includes(keyType)) throw new Error(`refused ${keyType}`);
    this.registered.push({ keyType, wif, password, strict });
    const settings = this.settings ?? { strict: {}, alias: '' };
    this.settings = {
      ...settings,
      strict: { ...settings.strict, [keyType]: strict },
      authorizedAccounts: strict
        ? settings.authorizedAccounts
        : { ...settings.authorizedAccounts, [keyType]: AUTHORITY_ACCOUNT }
    };
    return { ok: true };
  }

  async getRegisteredUserByUsername(username: string): Promise<AuthUser | null> {
    if (!this.registered.length) return null;
    return {
      username,
      unlocked: true,
      authorized: true,
      loggedInKeyType: this.registered[0].keyType,
      registeredKeyTypes: this.registered.map(({ keyType }) => keyType)
    };
  }

  async getUserSettings(): Promise<UserSettings | null> {
    return this.settings;
  }

  /** As the safe-storage sign-in leaves it */
  static signedIn(keyType: KeyAuthorityType, strict: boolean): FakeSafeStorage {
    const storage = new FakeSafeStorage();
    void storage.register(USERNAME, 'password', `${keyType}-wif`, keyType, strict);
    return storage;
  }
}

/** A lookup finding `sharedKeyTypes` for every key, and keeping the errors it is told of */
function lookup(sharedKeyTypes: KeyAuthorityType[] = []) {
  const errors: KeyAuthorityType[] = [];
  const sharedKeyLookup: SharedKeyLookup = {
    findSharedKeyTypes: async () => sharedKeyTypes,
    onSharedKeyError: (_error, keyType) => errors.push(keyType)
  };
  return { sharedKeyLookup, errors };
}

describe('registerAddedSafeStorageKey', () => {
  it('registers the added key non-strict when the session key was, so its authority account is recorded', async () => {
    const storage = FakeSafeStorage.signedIn('posting', false);

    await registerAddedSafeStorageKey(
      storage,
      { username: USERNAME, password: 'password', wif: 'active-wif', keyType: 'active' },
      'posting',
      lookup().sharedKeyLookup
    );

    assert.deepEqual(storage.registered[1], { keyType: 'active', wif: 'active-wif', password: 'password', strict: false });
    assert.deepEqual(storage.settings?.strict, { posting: false, active: false });
    assert.equal(storage.settings?.authorizedAccounts?.active, AUTHORITY_ACCOUNT);
  });

  it('registers the added key strict when the session key was', async () => {
    const storage = FakeSafeStorage.signedIn('active', true);

    await registerAddedSafeStorageKey(
      storage,
      { username: USERNAME, password: 'password', wif: 'posting-wif', keyType: 'posting' },
      'active',
      lookup().sharedKeyLookup
    );

    assert.deepEqual(storage.settings?.strict, { active: true, posting: true });
    assert.equal(storage.settings?.authorizedAccounts, undefined);
  });

  it('registers the added key strict when safe storage has no setting for the session key', async () => {
    const storage = new FakeSafeStorage();

    await registerAddedSafeStorageKey(
      storage,
      { username: USERNAME, password: 'password', wif: 'active-wif', keyType: 'active' },
      'posting',
      lookup().sharedKeyLookup
    );

    assert.equal(storage.registered[0].strict, true);
  });
});

describe('registerSafeStorageKey', () => {
  const key = { username: USERNAME, password: 'password', wif: 'shared-wif', strict: false } as const;

  it('registers a key that is also the active key for both types, with the same password and mode', async () => {
    const storage = new FakeSafeStorage();

    await registerSafeStorageKey(storage, { ...key, keyType: 'posting' }, lookup(['active']).sharedKeyLookup);

    assert.deepEqual(storage.registered, [
      { keyType: 'posting', wif: 'shared-wif', password: 'password', strict: false },
      { keyType: 'active', wif: 'shared-wif', password: 'password', strict: false }
    ]);
  });

  it('registers a key of one type for that type only', async () => {
    const storage = new FakeSafeStorage();

    await registerSafeStorageKey(storage, { ...key, keyType: 'active' }, lookup().sharedKeyLookup);

    assert.deepEqual(
      storage.registered.map(({ keyType }) => keyType),
      ['active']
    );
  });

  it('leaves a key type safe storage already holds as it is', async () => {
    const storage = FakeSafeStorage.signedIn('active', true);

    await registerSafeStorageKey(storage, { ...key, keyType: 'posting' }, lookup(['active']).sharedKeyLookup);

    assert.deepEqual(
      storage.registered.map(({ keyType, wif }) => [keyType, wif]),
      [
        ['active', 'active-wif'],
        ['posting', 'shared-wif']
      ]
    );
  });

  it('keeps the key for its own type when another type refuses it, and reports that type', async () => {
    const storage = new FakeSafeStorage();
    storage.failingKeyTypes = ['active'];
    const { sharedKeyLookup, errors } = lookup(['active']);

    await registerSafeStorageKey(storage, { ...key, keyType: 'posting' }, sharedKeyLookup);

    assert.deepEqual(
      storage.registered.map(({ keyType }) => keyType),
      ['posting']
    );
    assert.deepEqual(errors, ['active']);
  });

  it('rejects when the key cannot be registered for its own type', async () => {
    const storage = new FakeSafeStorage();
    storage.failingKeyTypes = ['posting'];

    await assert.rejects(
      registerSafeStorageKey(storage, { ...key, keyType: 'posting' }, lookup(['active']).sharedKeyLookup),
      /refused posting/
    );
    assert.deepEqual(storage.registered, []);
  });
});

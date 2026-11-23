import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { AuthStatus, AuthUser, CheckCredential, KeyAuthorityType } from '@hiveio/hb-auth';

// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/signer/credential-storage': new URL('../signer/credential-storage.ts', import.meta.url).href,
  '@smart-signer/lib/signer/safe-storage-registration': new URL('../signer/safe-storage-registration.ts', import.meta.url)
    .href,
  '@smart-signer/lib/auth/safe-storage-unlock': new URL('./safe-storage-unlock.ts', import.meta.url).href,
  '@smart-signer/lib/wrong-safe-storage-password': new URL('../wrong-safe-storage-password.ts', import.meta.url).href,
  '@smart-signer/lib/signer/active-check': new URL('../signer/active-check.ts', import.meta.url).href,
  '@smart-signer/lib/signer/sign-in-check': new URL('../signer/sign-in-check.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { protectStoredKeys, settleStoredKeysBeforeLeaving } = await import('./key-protection.ts');
const { importKeysIntoSafeStorage, keysHeldInSafeStorage, SafeStorageKeyMismatchError } = await import(
  '../signer/safe-storage-import.ts'
);
const { wifCredentialKey } = await import('../signer/credential-storage.ts');
const { WrongSafeStoragePasswordError } = await import('../wrong-safe-storage-password.ts');

type WifKey = { keyType: KeyAuthorityType; wif: string };
type KeyProtectionChoice = 'protect' | 'notNow' | 'forget';

const USERNAME = 'alice';
const PASSWORD = 'safe-storage-password';

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

/** A "signature" names the key that made it, so the check below can tell which one signed */
const KEY_CHECK = {
  publicKeyOf: (wif: string) => `PUB(${wif})`,
  signingKeyOf: (digest: string, signature: string) => {
    const [signedDigest, wif] = signature.split('|');
    assert.equal(signedDigest, digest);
    return `PUB(${wif})`;
  }
};

/**
 * hb-auth's online client as far as importing goes: holds USERNAME's keys behind one password,
 * unlocked once authenticated or registered, and refuses a wrong password as its worker does. With
 * `requireActiveCheck`, its `sign` refuses active and owner keys, which sign only with the password.
 */
class FakeSafeStorage {
  keys = new Map<KeyAuthorityType, string>();
  password: string | null = null;
  unlocked = false;
  requireActiveCheck = false;

  async getRegisteredUserByUsername(username: string): Promise<AuthUser | null> {
    if (username !== USERNAME || this.password === null) return null;
    const registeredKeyTypes = [...this.keys.keys()];
    return { username, unlocked: this.unlocked, authorized: this.unlocked, loggedInKeyType: undefined, registeredKeyTypes };
  }
  async getUserSettings() {
    return null;
  }
  async register(_username: string, password: string, wif: string, keyType: KeyAuthorityType): Promise<AuthStatus> {
    this.password ??= password;
    this.keys.set(keyType, wif);
    this.unlocked = true;
    return { ok: true };
  }
  async authenticate(_username: string, password: string): Promise<AuthStatus> {
    if (password !== this.password) throw Object.assign(new Error('Invalid credentials'), { name: 'AuthorizationError' });
    this.unlocked = true;
    return { ok: true };
  }
  async lock() {
    this.unlocked = false;
  }
  async unlock(username: string, password: string) {
    await this.authenticate(username, password);
  }
  async sign(_username: string, digest: string, keyType: KeyAuthorityType): Promise<string> {
    if (!this.unlocked) throw new Error('locked');
    if (this.requireActiveCheck && keyType !== 'posting') {
      throw Object.assign(new Error(`Signing with the '${keyType}' key requires a check`), { name: 'CheckRequiredError' });
    }
    return `${digest}|${this.keys.get(keyType)}`;
  }
  async signWithCheck(_username: string, digest: string, keyType: KeyAuthorityType, credential: CheckCredential) {
    if (!('password' in credential) || credential.password !== this.password) {
      throw Object.assign(new Error('Invalid credentials'), { name: 'AuthorizationError' });
    }
    return `${digest}|${this.keys.get(keyType)}`;
  }
}

function storageWith(keys: Partial<Record<KeyAuthorityType, string>>): StubStorage {
  const storage = new StubStorage();
  for (const [keyType, wif] of Object.entries(keys)) {
    storage.setItem(wifCredentialKey(USERNAME, keyType), JSON.stringify(wif));
  }
  storage.setItem(wifCredentialKey('bob', 'posting'), JSON.stringify('bob-posting'));
  return storage;
}

/** The steps protecting USERNAME's keys with `safeStorage`, recording what the user was asked */
function stepsFor(
  storage: StubStorage,
  safeStorage: FakeSafeStorage,
  answers: { choice: KeyProtectionChoice; confirmForget?: boolean; password?: string }
) {
  const asked: string[] = [];
  return {
    asked,
    steps: {
      storage,
      findHeldKeys: (keys: WifKey[]) => keysHeldInSafeStorage(safeStorage, USERNAME, keys, KEY_CHECK),
      askToProtect: async () => {
        asked.push('protect');
        return answers.choice;
      },
      confirmForget: async () => {
        asked.push('confirm forget');
        return answers.confirmForget ?? false;
      },
      importKeys: async (keys: WifKey[]) => {
        asked.push(`password for ${keys.map(({ keyType }) => keyType).join('+')}`);
        if (answers.password === undefined) return false;
        await importKeysIntoSafeStorage(safeStorage, USERNAME, answers.password, keys, KEY_CHECK);
        return true;
      },
      snooze: () => asked.push('snoozed')
    }
  };
}

describe('protectStoredKeys', () => {
  it('imports every saved key into a new safe storage wallet, checks it signs with them, then removes them', async () => {
    const storage = storageWith({ posting: 'posting-wif', active: 'active-wif' });
    const safeStorage = new FakeSafeStorage();
    const { asked, steps } = stepsFor(storage, safeStorage, { choice: 'protect', password: PASSWORD });

    assert.equal(await protectStoredKeys(USERNAME, steps), 'moved');

    assert.deepEqual(asked, ['protect', 'password for posting+active']);
    assert.deepEqual(Object.fromEntries(safeStorage.keys), { posting: 'posting-wif', active: 'active-wif' });
    assert.deepEqual(storage.keys(), [wifCredentialKey('bob', 'posting')]);
  });

  it('keeps the saved keys when safe storage signs with another key than the saved one', async () => {
    const storage = storageWith({ posting: 'posting-wif' });
    const safeStorage = new FakeSafeStorage();
    safeStorage.password = PASSWORD;
    safeStorage.keys.set('posting', 'older-posting-wif');
    const { steps } = stepsFor(storage, safeStorage, { choice: 'protect', password: PASSWORD });

    await assert.rejects(protectStoredKeys(USERNAME, steps), SafeStorageKeyMismatchError);

    assert.equal(storage.getItem(wifCredentialKey(USERNAME, 'posting')), JSON.stringify('posting-wif'));
    assert.equal(safeStorage.keys.get('posting'), 'older-posting-wif');
  });

  it('writes nothing and keeps the saved keys when the existing wallet refuses the password', async () => {
    const storage = storageWith({ active: 'active-wif' });
    const safeStorage = new FakeSafeStorage();
    safeStorage.password = PASSWORD;
    safeStorage.keys.set('posting', 'posting-wif');
    const { steps } = stepsFor(storage, safeStorage, { choice: 'protect', password: 'wrong' });

    await assert.rejects(protectStoredKeys(USERNAME, steps), WrongSafeStoragePasswordError);

    assert.deepEqual([...safeStorage.keys.keys()], ['posting']);
    assert.equal(storage.getItem(wifCredentialKey(USERNAME, 'active')), JSON.stringify('active-wif'));
  });

  it('adds the saved key to an existing wallet with its password', async () => {
    const storage = storageWith({ active: 'active-wif' });
    const safeStorage = new FakeSafeStorage();
    safeStorage.password = PASSWORD;
    safeStorage.keys.set('posting', 'posting-wif');
    const { steps } = stepsFor(storage, safeStorage, { choice: 'protect', password: PASSWORD });

    assert.equal(await protectStoredKeys(USERNAME, steps), 'moved');

    assert.equal(safeStorage.keys.get('active'), 'active-wif');
    assert.equal(storage.getItem(wifCredentialKey(USERNAME, 'active')), null);
  });

  it('imports an active key into a wallet asking for the check, verifying it with the password', async () => {
    const storage = storageWith({ active: 'active-wif' });
    const safeStorage = new FakeSafeStorage();
    safeStorage.password = PASSWORD;
    safeStorage.requireActiveCheck = true;
    safeStorage.keys.set('posting', 'posting-wif');
    const { steps } = stepsFor(storage, safeStorage, { choice: 'protect', password: PASSWORD });

    assert.equal(await protectStoredKeys(USERNAME, steps), 'moved');

    assert.equal(safeStorage.keys.get('active'), 'active-wif');
    assert.equal(storage.getItem(wifCredentialKey(USERNAME, 'active')), null);
  });

  it('on "Not now" keeps the saved keys and puts off asking again', async () => {
    const storage = storageWith({ posting: 'posting-wif' });
    const safeStorage = new FakeSafeStorage();
    const { asked, steps } = stepsFor(storage, safeStorage, { choice: 'notNow' });

    assert.equal(await protectStoredKeys(USERNAME, steps), 'snoozed');

    assert.deepEqual(asked, ['protect', 'snoozed']);
    assert.equal(storage.getItem(wifCredentialKey(USERNAME, 'posting')), JSON.stringify('posting-wif'));
    assert.equal(safeStorage.password, null);
  });

  it('takes a closed password prompt as "Not now"', async () => {
    const storage = storageWith({ posting: 'posting-wif' });
    const { asked, steps } = stepsFor(storage, new FakeSafeStorage(), { choice: 'protect' });

    assert.equal(await protectStoredKeys(USERNAME, steps), 'snoozed');

    assert.deepEqual(asked, ['protect', 'password for posting', 'snoozed']);
    assert.equal(storage.getItem(wifCredentialKey(USERNAME, 'posting')), JSON.stringify('posting-wif'));
  });

  it('removes a saved key unlocked safe storage already signs with, without asking', async () => {
    const storage = storageWith({ posting: 'posting-wif', active: 'active-wif' });
    const safeStorage = new FakeSafeStorage();
    safeStorage.password = PASSWORD;
    safeStorage.keys.set('posting', 'posting-wif');
    safeStorage.keys.set('active', 'active-wif');
    safeStorage.unlocked = true;
    const { asked, steps } = stepsFor(storage, safeStorage, { choice: 'notNow' });

    assert.equal(await protectStoredKeys(USERNAME, steps), 'moved');

    assert.deepEqual(asked, []);
    assert.deepEqual(storage.keys(), [wifCredentialKey('bob', 'posting')]);
  });

  it('asks only for the saved keys safe storage does not hold', async () => {
    const storage = storageWith({ posting: 'posting-wif', active: 'active-wif' });
    const safeStorage = new FakeSafeStorage();
    safeStorage.password = PASSWORD;
    safeStorage.keys.set('posting', 'posting-wif');
    safeStorage.unlocked = true;
    const { asked, steps } = stepsFor(storage, safeStorage, { choice: 'notNow' });

    assert.equal(await protectStoredKeys(USERNAME, steps), 'snoozed');

    assert.deepEqual(asked, ['protect', 'snoozed']);
    assert.deepEqual(storage.keys(), [wifCredentialKey(USERNAME, 'active'), wifCredentialKey('bob', 'posting')]);
  });

  it('on a confirmed "Forget saved key" removes every saved key of the account and imports none', async () => {
    const storage = storageWith({ posting: 'posting-wif', active: 'active-wif' });
    const safeStorage = new FakeSafeStorage();
    const { asked, steps } = stepsFor(storage, safeStorage, { choice: 'forget', confirmForget: true });

    assert.equal(await protectStoredKeys(USERNAME, steps), 'forgotten');

    assert.deepEqual(asked, ['protect', 'confirm forget']);
    assert.deepEqual(storage.keys(), [wifCredentialKey('bob', 'posting')]);
    assert.equal(safeStorage.password, null);
  });

  it('keeps the saved keys when forgetting them is not confirmed', async () => {
    const storage = storageWith({ posting: 'posting-wif' });
    const { asked, steps } = stepsFor(storage, new FakeSafeStorage(), { choice: 'forget', confirmForget: false });

    assert.equal(await protectStoredKeys(USERNAME, steps), 'snoozed');

    assert.deepEqual(asked, ['protect', 'confirm forget', 'snoozed']);
    assert.equal(storage.getItem(wifCredentialKey(USERNAME, 'posting')), JSON.stringify('posting-wif'));
  });

  it('does nothing for an account with no saved key', async () => {
    const { asked, steps } = stepsFor(storageWith({}), new FakeSafeStorage(), { choice: 'protect' });

    assert.equal(await protectStoredKeys(USERNAME, steps), 'none');
    assert.deepEqual(asked, []);
  });
});

/** The steps settling saved keys before leaving, answering `choice` and recording what was asked */
function leaveStepsFor(
  storage: StubStorage,
  choice: 'protect' | 'forget' | 'cancel',
  protectOutcome: 'moved' | 'snoozed' = 'moved'
) {
  const asked: string[] = [];
  return {
    asked,
    steps: {
      storage,
      askBeforeLeaving: async (usernames: string[]) => {
        asked.push(`leave ${usernames.join('+')}`);
        return choice;
      },
      protect: async (username: string) => {
        asked.push(`protect ${username}`);
        return protectOutcome;
      }
    }
  };
}

describe('settleStoredKeysBeforeLeaving', () => {
  it('goes on without asking when no account leaving has a saved key', async () => {
    const storage = storageWith({});
    const { asked, steps } = leaveStepsFor(storage, 'cancel');

    assert.equal(await settleStoredKeysBeforeLeaving([USERNAME, 'carol'], steps), true);

    assert.deepEqual(asked, []);
    assert.deepEqual(storage.keys(), [wifCredentialKey('bob', 'posting')]);
  });

  it('on "Cancel" stays, keeping the saved keys', async () => {
    const storage = storageWith({ posting: 'posting-wif' });
    const { asked, steps } = leaveStepsFor(storage, 'cancel');

    assert.equal(await settleStoredKeysBeforeLeaving([USERNAME], steps), false);

    assert.deepEqual(asked, [`leave ${USERNAME}`]);
    assert.deepEqual(storage.keys(), [wifCredentialKey(USERNAME, 'posting'), wifCredentialKey('bob', 'posting')]);
  });

  it('on "Forget" removes the saved keys of every account leaving, and of no other', async () => {
    const storage = storageWith({ posting: 'posting-wif', active: 'active-wif' });
    storage.setItem(wifCredentialKey('carol', 'active'), JSON.stringify('carol-active'));
    const { asked, steps } = leaveStepsFor(storage, 'forget');

    assert.equal(await settleStoredKeysBeforeLeaving([USERNAME, 'carol', 'dave'], steps), true);

    assert.deepEqual(asked, [`leave ${USERNAME}+carol`]);
    assert.deepEqual(storage.keys(), [wifCredentialKey('bob', 'posting')]);
  });

  it('on "Protect" moves the keys of each account and goes on', async () => {
    const storage = storageWith({ posting: 'posting-wif' });
    const { asked, steps } = leaveStepsFor(storage, 'protect');

    assert.equal(await settleStoredKeysBeforeLeaving([USERNAME, 'bob'], steps), true);

    assert.deepEqual(asked, [`leave ${USERNAME}+bob`, `protect ${USERNAME}`, 'protect bob']);
  });

  it('stays when the password prompt was closed, removing nothing', async () => {
    const storage = storageWith({ posting: 'posting-wif' });
    const { steps } = leaveStepsFor(storage, 'protect', 'snoozed');

    assert.equal(await settleStoredKeysBeforeLeaving([USERNAME], steps), false);

    assert.equal(storage.getItem(wifCredentialKey(USERNAME, 'posting')), JSON.stringify('posting-wif'));
  });
});

describe('keysHeldInSafeStorage', () => {
  it('tells nothing while the wallet is locked', async () => {
    const safeStorage = new FakeSafeStorage();
    safeStorage.password = PASSWORD;
    safeStorage.keys.set('posting', 'posting-wif');

    assert.deepEqual(await keysHeldInSafeStorage(safeStorage, USERNAME, [{ keyType: 'posting', wif: 'posting-wif' }], KEY_CHECK), []);
  });

  it('tells an active key of an unlocked wallet asking for the check held', async () => {
    const safeStorage = new FakeSafeStorage();
    safeStorage.password = PASSWORD;
    safeStorage.unlocked = true;
    safeStorage.requireActiveCheck = true;
    safeStorage.keys.set('posting', 'posting-wif');
    safeStorage.keys.set('active', 'active-wif');
    const keys = [{ keyType: 'active' as const, wif: 'active-wif' }];

    assert.deepEqual(await keysHeldInSafeStorage(safeStorage, USERNAME, keys, KEY_CHECK), keys);
  });
});

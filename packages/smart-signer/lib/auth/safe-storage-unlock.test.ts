import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import type { AuthUser, KeyAuthorityType } from '@hiveio/hb-auth';

// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/wrong-safe-storage-password': new URL('../wrong-safe-storage-password.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { authenticateStoredKey, unlockBeforeKeyWrite } = await import('./safe-storage-unlock.ts');
const { WrongSafeStoragePasswordError } = await import('../wrong-safe-storage-password.ts');

const USERNAME = 'alice';
const PASSWORD = 'safe-storage-password';

/** hb-auth's refusal as its worker hands it over: Comlink's plain Error carrying the class's name */
function workerRefusal(message: string): Error {
  return Object.assign(new Error(message), { name: 'AuthorizationError' });
}

/** hb-auth's own error class, which its authority check on the main thread rejects with */
class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/** Safe storage holding `keyTypes` of USERNAME's keys, unlocked by PASSWORD, as hb-auth's worker refuses */
class FakeSafeStorage {
  calls: string[] = [];
  /** Whether the account's authority on chain still accepts the stored keys */
  onChain = true;

  /** The key safe storage holds for each key type: the WIF last written */
  storedKeys: Partial<Record<KeyAuthorityType, string>>;

  readonly keyTypes: KeyAuthorityType[];
  readonly authorized: boolean;
  unlocked: boolean;

  constructor(keyTypes: KeyAuthorityType[], authorized = false, unlocked = false) {
    this.keyTypes = keyTypes;
    this.authorized = authorized;
    this.unlocked = authorized && unlocked;
    this.storedKeys = Object.fromEntries(keyTypes.map((keyType) => [keyType, `${keyType}-wif`]));
  }

  async getRegisteredUserByUsername(username: string): Promise<AuthUser | null> {
    if (username !== USERNAME || !this.keyTypes.length) return null;
    return {
      username,
      authorized: this.authorized,
      unlocked: this.unlocked,
      loggedInKeyType: this.keyTypes[0],
      registeredKeyTypes: this.keyTypes
    };
  }

  async authenticate(username: string, password: string, keyType: KeyAuthorityType) {
    this.calls.push(`authenticate ${keyType}`);
    if (!(await this.getRegisteredUserByUsername(username))) throw workerRefusal('Invalid credentials');
    if (password !== PASSWORD) throw workerRefusal('Invalid credentials');
    if (!this.keyTypes.includes(keyType)) throw workerRefusal('Not authorized, missing authority');
    if (!this.onChain) throw new AuthorizationError('Invalid credentials');
    return { ok: true };
  }

  /** As hb-auth's worker: locks the unlocked wallets, keeping their sessions */
  async lock() {
    this.calls.push('lock');
    if (!this.unlocked) throw workerRefusal('There is no existing user session or session already expired');
    this.unlocked = false;
  }

  /** As hb-auth's worker: an unlocked wallet is not unlocked again, so its password goes unchecked */
  async unlock(username: string, password: string) {
    this.calls.push('unlock');
    if (!this.authorized) throw workerRefusal('There is no existing user session or session already expired');
    if (this.unlocked) return;
    if (password !== PASSWORD) throw workerRefusal('Invalid credentials');
    this.unlocked = true;
  }
}

/** Replaces the key stored for `keyType` with `wif` once `unlockBeforeKeyWrite` let the write go on */
async function writeKey(storage: FakeSafeStorage, password: string, keyType: KeyAuthorityType, wif: string) {
  await unlockBeforeKeyWrite(storage, USERNAME, password, keyType);
  storage.storedKeys[keyType] = wif;
}

describe('authenticateStoredKey', () => {
  it('signs in with the stored key and the right password', async () => {
    const storage = new FakeSafeStorage(['posting', 'active']);
    await authenticateStoredKey(storage, USERNAME, PASSWORD, 'active');
    assert.deepEqual(storage.calls, ['authenticate active']);
  });

  it('rejects a wrong password with WrongSafeStoragePasswordError', async () => {
    const storage = new FakeSafeStorage(['posting', 'active']);
    await assert.rejects(authenticateStoredKey(storage, USERNAME, 'wrong', 'posting'), WrongSafeStoragePasswordError);
  });

  it('rejects with hb-auth refusal when no key is stored for the key type', async () => {
    const storage = new FakeSafeStorage(['posting']);
    await assert.rejects(authenticateStoredKey(storage, USERNAME, PASSWORD, 'active'), {
      message: 'Not authorized, missing authority'
    });
  });

  it('rejects with hb-auth refusal when the account authority no longer accepts the key', async () => {
    const storage = new FakeSafeStorage(['posting']);
    storage.onChain = false;
    await assert.rejects(authenticateStoredKey(storage, USERNAME, PASSWORD, 'posting'), AuthorizationError);
  });

  it('rejects with hb-auth refusal for an account safe storage does not hold', async () => {
    const storage = new FakeSafeStorage([]);
    const refusal = await authenticateStoredKey(storage, USERNAME, PASSWORD, 'posting').catch((error) => error);
    assert.ok(!(refusal instanceof WrongSafeStoragePasswordError));
    assert.equal(refusal.message, 'Invalid credentials');
  });
});

describe('unlockBeforeKeyWrite', () => {
  it('signs in with the stored key when hb-auth has no session of the user', async () => {
    const storage = new FakeSafeStorage(['active']);
    assert.equal(await unlockBeforeKeyWrite(storage, USERNAME, PASSWORD, 'active'), true);
    assert.deepEqual(storage.calls, ['authenticate active']);
  });

  it('unlocks the session hb-auth has of the user', async () => {
    const storage = new FakeSafeStorage(['active'], true);
    assert.equal(await unlockBeforeKeyWrite(storage, USERNAME, PASSWORD, 'active'), true);
    assert.deepEqual(storage.calls, ['unlock']);
  });

  it('locks the unlocked session of the user so that unlocking checks the password', async () => {
    const storage = new FakeSafeStorage(['active'], true, true);
    assert.equal(await unlockBeforeKeyWrite(storage, USERNAME, PASSWORD, 'active'), true);
    assert.deepEqual(storage.calls, ['lock', 'unlock']);
    assert.equal(storage.unlocked, true);
  });

  for (const [authorized, unlocked] of [
    [false, false],
    [true, false],
    [true, true]
  ]) {
    it(`rejects a wrong password with WrongSafeStoragePasswordError (session: ${authorized}, unlocked: ${unlocked})`, async () => {
      const storage = new FakeSafeStorage(['posting', 'active'], authorized, unlocked);
      await assert.rejects(unlockBeforeKeyWrite(storage, USERNAME, 'wrong', 'active'), WrongSafeStoragePasswordError);
    });
  }

  it('keeps the stored key of an unlocked session from a wrong password', async () => {
    const storage = new FakeSafeStorage(['active'], true, true);
    await assert.rejects(writeKey(storage, 'wrong', 'active', 'new-wif'), WrongSafeStoragePasswordError);
    assert.equal(storage.storedKeys.active, 'active-wif');
    assert.equal(storage.unlocked, false);
  });

  it('replaces the stored key of an unlocked session with the right password', async () => {
    const storage = new FakeSafeStorage(['active'], true, true);
    await writeKey(storage, PASSWORD, 'active', 'new-wif');
    assert.equal(storage.storedKeys.active, 'new-wif');
  });

  it('leaves the password to the write when no key is stored for the key type', async () => {
    const storage = new FakeSafeStorage(['posting']);
    assert.equal(await unlockBeforeKeyWrite(storage, USERNAME, PASSWORD, 'active'), false);
  });

  it('leaves the password to the write when the account authority no longer accepts the key', async () => {
    const storage = new FakeSafeStorage(['active']);
    storage.onChain = false;
    assert.equal(await unlockBeforeKeyWrite(storage, USERNAME, PASSWORD, 'active'), false);
  });
});

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

  readonly keyTypes: KeyAuthorityType[];
  readonly authorized: boolean;

  constructor(keyTypes: KeyAuthorityType[], authorized = false) {
    this.keyTypes = keyTypes;
    this.authorized = authorized;
  }

  async getRegisteredUserByUsername(username: string): Promise<AuthUser | null> {
    if (username !== USERNAME || !this.keyTypes.length) return null;
    return {
      username,
      authorized: this.authorized,
      unlocked: false,
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

  async unlock(username: string, password: string) {
    this.calls.push('unlock');
    if (!this.authorized) throw workerRefusal('There is no existing user session or session already expired');
    if (password !== PASSWORD) throw workerRefusal('Invalid credentials');
  }
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

  for (const authorized of [false, true]) {
    it(`rejects a wrong password with WrongSafeStoragePasswordError (session: ${authorized})`, async () => {
      const storage = new FakeSafeStorage(['posting', 'active'], authorized);
      await assert.rejects(unlockBeforeKeyWrite(storage, USERNAME, 'wrong', 'active'), WrongSafeStoragePasswordError);
    });
  }

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

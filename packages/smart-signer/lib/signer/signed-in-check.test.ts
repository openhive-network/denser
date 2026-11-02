import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const STUBS: Record<string, string> = {
  '@hive/ui/lib/logging':
    'const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop, debug: noop });',
  '@smart-signer/lib/utils': 'export const isStorageAvailable = () => globalThis.localStorageAvailable;',
  '@smart-signer/lib/auth/default-user': "export const defaultUser = { isLoggedIn: false, username: '' };",
  '@smart-signer/types/common': 'export let User;'
};
// Under node's type stripping the `@smart-signer/` and `@transaction/` aliases do not resolve
const MODULES: Record<string, string> = {
  '@transaction/lib/signed-out': new URL('../../../transaction/lib/signed-out.ts', import.meta.url).href,
  '@smart-signer/lib/auth/user-localstore': new URL('../auth/user-localstore.ts', import.meta.url).href,
  '@smart-signer/lib/safe-json-parse': new URL('../safe-json-parse.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const stub = STUBS[specifier];
    if (stub !== undefined) return { url: `data:text/javascript,${encodeURIComponent(stub)}`, shortCircuit: true };
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

/** The origin's localStorage, which every tab shares */
const storage = new Map<string, string>();
Object.assign(globalThis, {
  window: globalThis,
  localStorageAvailable: true,
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  }
});

const { askWhileSignedIn, askWhileSignedInIfSo, requireStillSignedInAs } = await import('./signed-in-check.ts');
const { SignedOutError } = await import('../../../transaction/lib/signed-out.ts');

/** What a sign-in, a sign-out or an account switch in any tab stores */
const storeUser = (username: string, isLoggedIn = true) =>
  storage.set('user', JSON.stringify({ isLoggedIn, username, loginType: 'wif', keyType: 'posting' }));

/** A key dialog, during which `meanwhile` happens (in another tab), answered with the active key */
const keyDialog = (meanwhile: () => void) => async () => {
  meanwhile();
  return { password: 'active-wif', storePassword: true };
};

/** Signs `username` in, with localStorage available */
const resetStorage = (username = 'alice') => {
  Object.assign(globalThis, { localStorageAvailable: true });
  storage.clear();
  if (username) storeUser(username);
};

describe('askWhileSignedIn', () => {
  beforeEach(() => resetStorage());

  it('gives the key entered by a user still signed in', async () => {
    const answer = await askWhileSignedIn('alice', keyDialog(() => {}));
    assert.deepEqual(answer, { password: 'active-wif', storePassword: true });
  });

  it('refuses the key entered after a sign-out in another tab', async () => {
    await assert.rejects(
      askWhileSignedIn('alice', keyDialog(() => storeUser('', false))),
      SignedOutError
    );
  });

  it('refuses it after the stored user was removed', async () => {
    await assert.rejects(
      askWhileSignedIn('alice', keyDialog(() => storage.delete('user'))),
      SignedOutError
    );
  });

  it('refuses it after a switch to another account', async () => {
    await assert.rejects(
      askWhileSignedIn('alice', keyDialog(() => storeUser('bob'))),
      SignedOutError
    );
  });

  it("passes the dialog's own rejection, a cancel, through", async () => {
    const cancelled = new Error('No password from user');
    await assert.rejects(
      askWhileSignedIn('alice', () => Promise.reject(cancelled)),
      (error) => error === cancelled
    );
  });
});

describe('requireStillSignedInAs', () => {
  beforeEach(() => resetStorage());

  it('passes for the stored signed-in user', () => {
    assert.doesNotThrow(() => requireStillSignedInAs('alice'));
  });

  it('refuses another account', () => {
    assert.throws(() => requireStillSignedInAs('bob'), SignedOutError);
  });

  it('passes without localStorage, where no user is stored to tell a sign-out', () => {
    Object.assign(globalThis, { localStorageAvailable: false });
    assert.doesNotThrow(() => requireStillSignedInAs('alice'));
  });
});

describe('askWhileSignedInIfSo', () => {
  beforeEach(() => resetStorage());

  it('refuses the key a signed-in user entered after a sign-out in another tab', async () => {
    await assert.rejects(
      askWhileSignedInIfSo('alice', keyDialog(() => storeUser('', false))),
      SignedOutError
    );
  });

  it('gives the key entered by a user still signed in', async () => {
    const answer = await askWhileSignedInIfSo('alice', keyDialog(() => {}));
    assert.deepEqual(answer, { password: 'active-wif', storePassword: true });
  });

  it('gives the key entered at a sign-in, before the user is stored', async () => {
    resetStorage('');
    const answer = await askWhileSignedInIfSo('alice', keyDialog(() => {}));
    assert.deepEqual(answer, { password: 'active-wif', storePassword: true });
  });

  it('gives the key entered at a sign-in as another account than the signed-in one', async () => {
    resetStorage('bob');
    const answer = await askWhileSignedInIfSo('alice', keyDialog(() => storeUser('alice')));
    assert.deepEqual(answer, { password: 'active-wif', storePassword: true });
  });
});

import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const STUBS: Record<string, string> = {
  '@hive/ui/lib/logging':
    'const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop, debug: noop });',
  '@smart-signer/lib/utils': 'export const isStorageAvailable = () => true;',
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
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key)
  }
});

const { askWhileSignedIn } = await import('./signed-in-check.ts');
const { SignedOutError } = await import('../../../transaction/lib/signed-out.ts');

/** What a sign-in, a sign-out or an account switch in any tab stores */
const storeUser = (username: string, isLoggedIn = true) =>
  storage.set('user', JSON.stringify({ isLoggedIn, username, loginType: 'wif', keyType: 'posting' }));

/** A key dialog, during which `meanwhile` happens (in another tab), answered with the active key */
const keyDialog = (meanwhile: () => void) => async () => {
  meanwhile();
  return { password: 'active-wif', storePassword: true };
};

describe('askWhileSignedIn', () => {
  beforeEach(() => {
    storage.clear();
    storeUser('alice');
  });

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

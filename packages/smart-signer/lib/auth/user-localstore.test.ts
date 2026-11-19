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
// Under node's type stripping the `@smart-signer/` aliases do not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/safe-json-parse': new URL('../safe-json-parse.ts', import.meta.url).href,
  '@smart-signer/lib/auth/known-login-type': new URL('./known-login-type.ts', import.meta.url).href
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

const storage = new Map<string, string>();
const localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key)
};
Object.assign(globalThis, { window: globalThis, localStorage });

const { getUser, getAccounts, isLogoutStorageEvent } = await import('./user-localstore.ts');

const stored = (username: string, loginType: string) => ({ isLoggedIn: true, username, loginType, keyType: 'posting' });
const userChange = (newValue: string) =>
  ({ storageArea: localStorage, key: 'user', newValue }) as unknown as StorageEvent;

describe('stored sessions of a login type the app no longer has', () => {
  beforeEach(() => storage.clear());

  it('reads the stored user as signed out', () => {
    storage.set('user', JSON.stringify(stored('alice', 'hivesigner')));
    assert.deepEqual(getUser(), { isLoggedIn: false, username: '' });

    storage.set('user', JSON.stringify(stored('alice', 'keychain')));
    assert.deepEqual(getUser(), stored('alice', 'keychain'));
  });

  it('leaves such an account out of the remembered accounts', () => {
    storage.set('accounts', JSON.stringify([stored('alice', 'hivesigner'), stored('bob', 'wif')]));
    assert.deepEqual(getAccounts(), [stored('bob', 'wif')]);
  });

  it("takes another tab's switch to such a user for a logout", () => {
    assert.equal(isLogoutStorageEvent(userChange(JSON.stringify(stored('alice', 'hivesigner')))), true);
    assert.equal(isLogoutStorageEvent(userChange(JSON.stringify(stored('alice', 'passkey')))), false);
  });
});

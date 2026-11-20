import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

const STUBS: Record<string, string> = {
  '@hiveio/wax': 'export const TTransactionPackType = { HF_26: 1 };',
  '@transaction/lib/chain': 'export const getChain = async () => { throw new Error("no chain in this test"); };',
  '@transaction/lib/missing-authority': 'export class MissingAuthorityError extends Error {}',
  '@smart-signer/lib/signer/signer':
    'export class Signer { constructor(options) { this.username = options.username; } }',
  '@smart-signer/lib/passkey/passkey-binding':
    'export const passkeyBindingOf = () => undefined; export const forgetPasskeyBinding = () => {};',
  '@smart-signer/lib/passkey/signer-client':
    'export class SignerError extends Error {} export const openSignerPopup = () => { throw new Error("no popup"); };'
};
// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/wrong-safe-storage-password': new URL('../wrong-safe-storage-password.ts', import.meta.url).href,
  '@smart-signer/lib/auth-failure': new URL('../auth-failure.ts', import.meta.url).href
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

const { SignerPasskey } = await import('./signer-passkey.ts');
const { findAuthFailureKey } = await import('../auth-failure.ts');

const LOCALES_DIR = new URL('../../locales/', import.meta.url);

function translate(locale: string, key: string): unknown {
  const translations = JSON.parse(readFileSync(new URL(`${locale}/smart-signer.json`, LOCALES_DIR), 'utf8'));
  return key.split('.').reduce((node, part) => node?.[part], translations);
}

describe('SignerPasskey', () => {
  it('refuses to sign for an account with no known passkey signer with a text in every locale', async () => {
    const signer = new SignerPasskey({ username: 'guest4test' } as never);

    const refusal = await signer.signTransaction({ transaction: {} } as never).catch((error: unknown) => error);

    assert.ok(refusal instanceof Error);
    assert.match(refusal.message, /No passkey signer is known for @guest4test/);
    const key = findAuthFailureKey(refusal);
    assert.equal(key, 'auth_error.passkey_signer_unknown');
    const english = translate('en', key ?? '');
    for (const locale of readdirSync(LOCALES_DIR)) {
      const text = translate(locale, key ?? '');
      assert.equal(typeof text, 'string', locale);
      if (locale !== 'en') assert.notEqual(text, english, locale);
    }
  });
});

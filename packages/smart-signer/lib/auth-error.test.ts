import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

const STUBS: Record<string, string> = {
  '@ui/lib/logging': 'const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop, debug: noop });'
};
// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/wrong-safe-storage-password': new URL('./wrong-safe-storage-password.ts', import.meta.url).href,
  '@smart-signer/lib/auth-failure': new URL('./auth-failure.ts', import.meta.url).href
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

const { toAuthFailure } = await import('./auth-error.ts');
const { AuthFailureError, findAuthFailureKey } = await import('./auth-failure.ts');

const LOCALES_DIR = new URL('../locales/', import.meta.url);

function translate(locale: string, key: string): unknown {
  const translations = JSON.parse(readFileSync(new URL(`${locale}/smart-signer.json`, LOCALES_DIR), 'utf8'));
  return key.split('.').reduce((node, part) => node?.[part], translations);
}

/** hb-auth's refusal as its worker's rejection crosses Comlink: a plain Error carrying hb-auth's name */
function hbAuthError(message: string): Error {
  const error = new Error(message);
  error.name = 'AuthorizationError';
  return error;
}

describe('toAuthFailure', () => {
  it("shows a known hb-auth failure in the page's language, however deep the signer wrapped it", () => {
    const signingFailure = new Error('Transfer failed', { cause: toAuthFailure(hbAuthError('Invalid password')) });

    const key = findAuthFailureKey(signingFailure);
    assert.equal(key, 'auth_error.invalid_password');
    const polish = translate('pl', key ?? '');
    assert.equal(polish, 'Nieprawidłowe hasło.');
    assert.notEqual(polish, translate('en', key ?? ''));
  });

  it("keeps hb-auth's English message for logs and the patterns matched on it", () => {
    const refusal = hbAuthError('Invalid password');
    const failure = toAuthFailure(refusal);

    assert.ok(failure instanceof AuthFailureError);
    assert.equal(failure.message, 'Invalid password');
    assert.equal(failure.cause, refusal);
  });

  it("leaves an unknown failure with hb-auth's own message and no key, for the generic toast", () => {
    const failure = toAuthFailure(hbAuthError('Worker crashed while reading the wallet'));

    assert.equal(failure.message, 'Worker crashed while reading the wallet');
    assert.equal(failure.messageKey, undefined);
    assert.equal(findAuthFailureKey(failure), undefined);
  });
});

describe('findAuthFailureKey', () => {
  it('finds no key in an error no AuthFailureError caused', () => {
    assert.equal(findAuthFailureKey(new Error('Invalid password')), undefined);
    assert.equal(findAuthFailureKey('Invalid password'), undefined);
  });

  it('reads the key a signing step set on its own failure', () => {
    const failure = new AuthFailureError('Unlocking key failed', 'auth_error.unlock_failed');

    assert.equal(findAuthFailureKey(failure), 'auth_error.unlock_failed');
  });
});

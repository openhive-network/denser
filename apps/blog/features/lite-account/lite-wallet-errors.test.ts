import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { LiteWalletUnlockError, liteWalletFailureMessage } from './lite-wallet-errors.ts';

const STUBS: Record<string, string> = {
  '@ui/lib/logging': 'const noop = () => {}; export const getLogger = () => ({ error: noop, warn: noop, info: noop, debug: noop });'
};
// Under node's type stripping the `@smart-signer/` alias does not resolve
const MODULES: Record<string, string> = {
  '@smart-signer/lib/wrong-safe-storage-password': new URL(
    '../../../../packages/smart-signer/lib/wrong-safe-storage-password.ts',
    import.meta.url
  ).href,
  '@smart-signer/lib/auth-failure': new URL('../../../../packages/smart-signer/lib/auth-failure.ts', import.meta.url).href
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

const { parseAuthError } = await import('../../../../packages/smart-signer/lib/auth-error.ts');

const SIGNER_LOCALES_DIR = new URL('../../../../packages/smart-signer/locales/', import.meta.url);

/** The smart-signer text of `key` in `locale`, as the blog's `t(key, { ns: 'smart-signer' })` gives it */
function signerTranslator(locale: string): (key: string) => string {
  const translations = JSON.parse(readFileSync(new URL(`${locale}/smart-signer.json`, SIGNER_LOCALES_DIR), 'utf8'));
  return (key) => String(key.split('.').reduce((node, part) => node?.[part], translations));
}

/** The error the browser lite wallet's unlock step throws when hb-auth refuses with `refusal` */
function unlockRefused(refusal: Error): LiteWalletUnlockError {
  const { message, messageKey } = parseAuthError(refusal);
  return new LiteWalletUnlockError(message, false, { cause: refusal, messageKey });
}

describe('liteWalletFailureMessage', () => {
  it("shows a known hb-auth refusal in the page's language", () => {
    const message = liteWalletFailureMessage(unlockRefused(new Error('Invalid password')), signerTranslator('pl'));

    assert.equal(message, 'Nieprawidłowe hasło.');
    assert.equal(message, signerTranslator('pl')('auth_error.invalid_password'));
  });

  it("shows hb-auth's own message for an unknown refusal", () => {
    const error = unlockRefused(new Error('Worker crashed while reading the wallet'));

    assert.equal(liteWalletFailureMessage(error, signerTranslator('pl')), 'Worker crashed while reading the wallet');
  });

  it('says nothing for a cancelled unlock and leaves any other failure to the caller', () => {
    const translate = signerTranslator('pl');

    assert.equal(liteWalletFailureMessage(new LiteWalletUnlockError('unlock cancelled', true), translate), null);
    assert.equal(liteWalletFailureMessage(new Error('Invalid password'), translate), undefined);
  });
});

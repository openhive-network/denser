import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { WaxExternalSignatureProviderError } from '@hiveio/wax-signers-external';
import { GoogleDriveSignInCancelledError } from './google-drive-sign-in-cancelled.ts';

// Under node's type stripping the `@ui/` alias does not resolve
const MODULES: Record<string, string> = {
  '@ui/lib/user-cancelled': new URL('../../../ui/lib/user-cancelled.ts', import.meta.url).href
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    const module = MODULES[specifier];
    if (module !== undefined) return { url: module, shortCircuit: true };
    return nextResolve(specifier, context);
  }
});

const { isWalletDecryptionFailure, needsGoogleSignInAgain } = await import('./google-drive-wallet-errors.ts');

const decryptionFailure = new WaxExternalSignatureProviderError(
  'Failed to decrypt wallet data. Invalid password or corrupted data.',
  undefined,
  'DECRYPTION_FAILED'
);
const missingKey = new WaxExternalSignatureProviderError('No key found for account: guest4test1', undefined, 'KEY_NOT_FOUND');

describe('isWalletDecryptionFailure', () => {
  it('recognises a wallet the password did not decrypt', () => {
    assert.equal(isWalletDecryptionFailure(decryptionFailure), true);
  });

  it('leaves a missing key and a plain error with the same text alone', () => {
    assert.equal(isWalletDecryptionFailure(missingKey), false);
    assert.equal(isWalletDecryptionFailure(new Error(decryptionFailure.message)), false);
  });
});

describe('needsGoogleSignInAgain', () => {
  it('signs in to Google again when the token or Drive access failed', () => {
    assert.equal(needsGoogleSignInAgain(new Error('Failed to refresh Google Drive access token')), true);
  });

  it('does not for a wrong password or a key the wallet lacks', () => {
    assert.equal(needsGoogleSignInAgain(decryptionFailure), false);
    assert.equal(needsGoogleSignInAgain(missingKey), false);
  });

  it('does not when the user closed the password prompt or a Google Drive dialog', () => {
    assert.equal(needsGoogleSignInAgain(new Error('No password from user')), false);
    assert.equal(needsGoogleSignInAgain(new GoogleDriveSignInCancelledError('key_not_found (User closed dialog)')), false);
  });
});

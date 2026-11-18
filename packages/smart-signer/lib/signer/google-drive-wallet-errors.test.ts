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

const { isWalletDecryptionFailure, needsGoogleSignInAgain, retryAfterGoogleSignIn, trackAccessToken } = await import('./google-drive-wallet-errors.ts');

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

describe('retryAfterGoogleSignIn', () => {
  it('reads the wallet again after a Google session failure, so a wrong password is still found', async () => {
    let attempts = 0;
    let signedInAgain = 0;
    await assert.rejects(
      retryAfterGoogleSignIn(
        async () => {
          attempts++;
          if (attempts === 1) throw new Error('Failed to refresh Google Drive access token');
          throw decryptionFailure;
        },
        () => void signedInAgain++
      ),
      decryptionFailure
    );
    assert.equal(attempts, 2);
    assert.equal(signedInAgain, 1);
  });

  it('does not sign in again when the wallet file answered', async () => {
    let attempts = 0;
    await assert.rejects(
      retryAfterGoogleSignIn(
        async () => {
          attempts++;
          throw decryptionFailure;
        },
        () => assert.fail('no new Google sign-in expected')
      ),
      decryptionFailure
    );
    assert.equal(attempts, 1);
  });

  it('gives up after one new sign-in', async () => {
    const sessionFailure = new Error('Failed to refresh Google Drive access token');
    let attempts = 0;
    await assert.rejects(
      retryAfterGoogleSignIn(
        async () => {
          attempts++;
          throw sessionFailure;
        },
        () => {}
      ),
      sessionFailure
    );
    assert.equal(attempts, 2);
  });
});

describe('trackAccessToken', () => {
  it('rethrows the failed token request, which wax reports as a missing wallet file', async () => {
    const tokenFailure = new Error('Failed to refresh Google Drive access token');
    const accessToken = trackAccessToken(async () => {
      throw tokenFailure;
    });
    await assert.rejects(accessToken.getToken(), tokenFailure);
    assert.throws(() => accessToken.throwIfFailed(), tokenFailure);
  });

  it('catches a token callback that throws before returning a promise', async () => {
    const notConfigured = new Error('Google Drive Signer is not properly configured.');
    const accessToken = trackAccessToken(() => {
      throw notConfigured;
    });
    await assert.rejects(accessToken.getToken(), notConfigured);
    assert.throws(() => accessToken.throwIfFailed(), notConfigured);
  });

  it('lets a wallet file Drive did not find be reported once the token was obtained', async () => {
    const accessToken = trackAccessToken(async () => 'token');
    assert.equal(await accessToken.getToken(), 'token');
    assert.doesNotThrow(() => accessToken.throwIfFailed());
  });

  it('forgets a failure once a later request got a token', async () => {
    let calls = 0;
    const accessToken = trackAccessToken(async () => {
      if (++calls === 1) throw new Error('Failed to refresh Google Drive access token');
      return 'token';
    });
    await assert.rejects(accessToken.getToken());
    await accessToken.getToken();
    assert.doesNotThrow(() => accessToken.throwIfFailed());
  });
});

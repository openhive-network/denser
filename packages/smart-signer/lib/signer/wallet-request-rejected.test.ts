import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isWalletRequestRejected } from './wallet-request-rejected.ts';

class WaxKeychainProviderError extends Error {}

/** What wax's Keychain provider throws: the extension's message flattened, its response kept as the cause */
const keychainError = (response: { error: string; message: string }) =>
  new WaxKeychainProviderError(`Keychain error: ${response.message}`, {
    cause: { success: false, ...response }
  });

describe('isWalletRequestRejected', () => {
  it('recognizes a Keychain request the user rejected, whatever the language of its message', () => {
    assert.equal(
      isWalletRequestRejected(keychainError({ error: 'user_cancel', message: 'Anulowano.' })),
      true
    );
  });

  it('recognizes a Keychain request the user ignored', () => {
    const error = keychainError({ error: 'ignored', message: 'User ignored this transaction' });
    assert.equal(isWalletRequestRejected(error), true);
  });

  it("recognizes Peak Vault's own response to a cancelled request", () => {
    assert.equal(
      isWalletRequestRejected({ success: false, error: 'user_cancel', message: 'Cancelled' }),
      true
    );
  });

  it('does not take a failed request for a rejected one', () => {
    assert.equal(
      isWalletRequestRejected(keychainError({ error: 'decode_error', message: 'Could not decode' })),
      false
    );
    assert.equal(
      isWalletRequestRejected({ success: false, error: 'sign_error', message: 'Could not sign' }),
      false
    );
    assert.equal(isWalletRequestRejected(new Error('Request was canceled by the user.')), false);
    assert.equal(isWalletRequestRejected(undefined), false);
  });
});

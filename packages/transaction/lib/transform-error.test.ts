import { describe, it } from 'mocha';
import { expect } from 'chai';
import { transformError } from './transform-error';

class WaxKeychainProviderError extends Error {
  name = 'WaxKeychainProviderError';
}

describe('transformError', () => {
  it("shows the Keychain extension's own answer and keeps it reportable, with details", () => {
    const error = new WaxKeychainProviderError('Keychain error: An error occured while signing the transaction');
    const { errorTitle, fullError, isWellKnownError, isKeychainMessageMissing } = transformError(error);
    expect(errorTitle).to.equal('An error occured while signing the transaction');
    expect(fullError).to.equal(
      'WaxKeychainProviderError: Keychain error: An error occured while signing the transaction'
    );
    expect(isWellKnownError).to.equal(false);
    expect(isKeychainMessageMissing).to.equal(false);
  });

  /** What wax's Keychain provider throws: the extension's message flattened, its response kept as the cause */
  function keychainError(response: { error: string; message: string }) {
    return new WaxKeychainProviderError(`Keychain error: ${response.message}`, {
      cause: { success: false, ...response }
    });
  }

  it('keeps a Keychain request dropped for a newer one reportable', () => {
    const error = keychainError({ error: 'ignored', message: 'User ignored this transaction' });
    const { errorTitle, isWellKnownError } = transformError(error);
    expect(errorTitle).to.equal('User ignored this transaction');
    expect(isWellKnownError).to.equal(false);
  });

  for (const message of [
    'Request was canceled by the user.',
    'Die Anfrage wurde vom Benutzer abgebrochen.',
    'La solicitud fue cancelada por el usuario.',
    '用户已取消请求。'
  ]) {
    it(`keeps a request the user rejected in Keychain quiet, whatever its language (${message})`, () => {
      const { errorTitle, isWellKnownError } = transformError(keychainError({ error: 'user_cancel', message }));
      expect(errorTitle).to.equal(message);
      expect(isWellKnownError).to.equal(true);
    });
  }

  it('keeps a user cancel quiet when the Keychain error is wrapped again', () => {
    const cancel = keychainError({ error: 'user_cancel', message: 'Anulowano.' });
    const { isWellKnownError } = transformError(new Error('Sign-in failed', { cause: cancel }));
    expect(isWellKnownError).to.equal(true);
  });

  it('does not take the English cancel text without the code for a user cancel', () => {
    const error = new WaxKeychainProviderError('Keychain error: Request was canceled by the user.');
    expect(transformError(error).isWellKnownError).to.equal(false);
  });

  /** What Peak Vault rejects a request with: its own response, not an Error */
  function peakVaultRejection(response: { error: string; message?: string }) {
    return { success: false, account: 'guest4test1', ...response };
  }

  it("shows Peak Vault's own answer to a rejected request instead of failing on it", () => {
    const rejection = peakVaultRejection({ error: 'sign_error', message: 'Could not sign the transaction' });
    const { errorTitle, fullError, isWellKnownError } = transformError(rejection);
    expect(errorTitle).to.equal('Could not sign the transaction');
    expect(fullError).to.contain('"error":"sign_error"');
    expect(isWellKnownError).to.equal(false);
  });

  it('keeps a request the user cancelled in Peak Vault quiet', () => {
    const rejection = peakVaultRejection({ error: 'user_cancel', message: 'Request was canceled by the user.' });
    const { errorTitle, isWellKnownError } = transformError(rejection);
    expect(errorTitle).to.equal('Request was canceled by the user.');
    expect(isWellKnownError).to.equal(true);
  });

  it('keeps the generic title for a Peak Vault rejection without a message', () => {
    const { errorTitle, isWellKnownError } = transformError(peakVaultRejection({ error: 'sign_error' }));
    expect(errorTitle).to.equal('Error');
    expect(isWellKnownError).to.equal(false);
  });

  for (const value of [{ status: 500 }, 42, undefined, null]) {
    it(`does not fail on a thrown value that is neither an Error nor a string (${String(value)})`, () => {
      expect(transformError(value).errorTitle).to.equal('Error');
    });
  }

  for (const message of ['undefined', '', '   ']) {
    it(`flags a Keychain error without an answer (${JSON.stringify(message)}) instead of showing it`, () => {
      const error = new WaxKeychainProviderError(`Keychain error: ${message}`);
      const { errorTitle, isWellKnownError, isKeychainMessageMissing } = transformError(error);
      expect(errorTitle).to.equal('Error');
      expect(isWellKnownError).to.equal(false);
      expect(isKeychainMessageMissing).to.equal(true);
    });
  }

  it('prefers a well-known description over the Keychain answer', () => {
    const error = new Error('Keychain error: Invalid credentials');
    const { errorTitle, isWellKnownError } = transformError(error);
    expect(errorTitle).to.equal('Invalid credentials');
    expect(isWellKnownError).to.equal(true);
  });

  it('keeps the generic title for an unknown error', () => {
    const { errorTitle, isWellKnownError, isKeychainMessageMissing } = transformError(new Error('boom'));
    expect(errorTitle).to.equal('Error');
    expect(isWellKnownError).to.equal(false);
    expect(isKeychainMessageMissing).to.equal(false);
  });
});

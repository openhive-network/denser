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

  it('keeps a Keychain request dropped for a newer one reportable', () => {
    const error = new WaxKeychainProviderError('Keychain error: User ignored this transaction');
    const { errorTitle, isWellKnownError } = transformError(error);
    expect(errorTitle).to.equal('User ignored this transaction');
    expect(isWellKnownError).to.equal(false);
  });

  it('keeps a request the user rejected in Keychain quiet', () => {
    const error = new WaxKeychainProviderError('Keychain error: Request was canceled by the user.');
    const { errorTitle, isWellKnownError } = transformError(error);
    expect(errorTitle).to.equal('Request was canceled by the user.');
    expect(isWellKnownError).to.equal(true);
  });

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

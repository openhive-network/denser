import { describe, it } from 'mocha';
import { expect } from 'chai';
import { transformError } from './transform-error';

describe('transformError', () => {
  it("shows the Keychain extension's own answer", () => {
    const error = new Error('Keychain error: User ignored this transaction');
    const { errorTitle, isWellKnownError } = transformError(error);
    expect(errorTitle).to.equal('User ignored this transaction');
    expect(isWellKnownError).to.equal(true);
  });

  it('prefers a well-known description over the Keychain answer', () => {
    const error = new Error('Keychain error: Invalid credentials');
    expect(transformError(error).errorTitle).to.equal('Invalid credentials');
  });

  it('keeps the generic title for an unknown error', () => {
    const { errorTitle, isWellKnownError } = transformError(new Error('boom'));
    expect(errorTitle).to.equal('Error');
    expect(isWellKnownError).to.equal(false);
  });
});

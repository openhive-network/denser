import { describe, it } from 'mocha';
import { expect } from 'chai';
import { requireSignedIn, SignedOutError } from './signed-out';

describe('requireSignedIn', () => {
  it('refuses the signer options of a signed-out reader, which name no user', () => {
    expect(() => requireSignedIn({ username: '' })).to.throw(SignedOutError, 'No user is signed in');
    expect(() => requireSignedIn(undefined)).to.throw(SignedOutError);
  });

  it('lets the signer options of a signed-in user through', () => {
    expect(() => requireSignedIn({ username: 'alice' })).not.to.throw();
  });
});

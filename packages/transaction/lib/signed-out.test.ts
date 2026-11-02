import { describe, it } from 'mocha';
import { expect } from 'chai';
import { requireSignedIn, requireStillSignedInAs, SignedOutError } from './signed-out';

describe('requireSignedIn', () => {
  it('refuses the signer options of a signed-out reader, which name no user', () => {
    expect(() => requireSignedIn({ username: '' })).to.throw(SignedOutError, 'No user is signed in');
    expect(() => requireSignedIn(undefined)).to.throw(SignedOutError);
  });

  it('lets the signer options of a signed-in user through', () => {
    expect(() => requireSignedIn({ username: 'alice' })).not.to.throw();
  });
});

describe('requireStillSignedInAs', () => {
  it('lets the signature of a user still signed in through', () => {
    expect(() => requireStillSignedInAs({ username: 'alice' }, 'alice')).not.to.throw();
  });

  it('refuses it after a sign-out while signing', () => {
    expect(() => requireStillSignedInAs({ username: '' }, 'alice')).to.throw(SignedOutError);
  });

  it('refuses it after a switch to another account while signing', () => {
    expect(() => requireStillSignedInAs({ username: 'bob' }, 'alice')).to.throw(SignedOutError);
  });
});

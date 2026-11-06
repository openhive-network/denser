import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { HiveUserProfile } from '../get-hive-user-profile.ts';
import { oauthDisplayName, profileDisplayName, sanitizeProfileText } from './profile-text.ts';

/** A profile as it comes off the chain: free-form JSON, whatever the type says */
function chainProfile(name: unknown): HiveUserProfile {
  return Object.assign({}, { name });
}

describe('profileDisplayName', () => {
  it('gives the profile name as plain text', () => {
    assert.equal(profileDisplayName({ name: '  <b>Alice</b> Smith ' }), 'Alice Smith');
    assert.equal(profileDisplayName({ name: 'x'.repeat(150) }), 'x'.repeat(100));
  });

  it('counts a name that is not a string as none', () => {
    for (const name of [123, { first: 'Alice' }, ['Alice'], true, null]) {
      assert.equal(profileDisplayName(chainProfile(name)), undefined, JSON.stringify(name));
      assert.equal(oauthDisplayName(chainProfile(name), 'alice'), 'alice', JSON.stringify(name));
    }
  });

  it('strips control and bidi characters', () => {
    assert.equal(profileDisplayName({ name: 'Al\u0000i\u0007ce\u009B\n' }), 'Alice');
    assert.equal(profileDisplayName({ name: '‮ecilA‬ ⁦Bob⁩‏؜' }), 'ecilA Bob');
  });

  it('counts a name of only control and bidi characters as none', () => {
    assert.equal(profileDisplayName({ name: '‮\u0000 ‎' }), undefined);
  });
});

describe('sanitizeProfileText', () => {
  it('counts a value that is not a string as none', () => {
    for (const value of [42, { about: 'x' }, ['x'], undefined, '']) assert.equal(sanitizeProfileText(value), undefined);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@smart-signer/types/common';
import { getLoginAuthority, lacksRequiredKeyType, missingKeyType } from './login-authority.ts';

// Values of LoginType and KeyType: the enums cannot load under type stripping
const session = (loginType: string, keyType: string, isLoggedIn = true) =>
  ({
    isLoggedIn,
    loginType: loginType as User['loginType'],
    keyType: keyType as User['keyType']
  }) as User;

const SIGNERS = ['keychain', 'peakvault', 'metamask', 'google', 'hiveauth', 'hivesigner'];

describe('getLoginAuthority', () => {
  for (const keyType of ['posting', 'active']) {
    it(`wif holds the ${keyType} key it signed in with, and no other`, () => {
      assert.deepEqual(getLoginAuthority(session('wif', keyType)), {
        kind: 'key',
        keyTypes: [keyType],
        canAddKey: false
      });
      assert.deepEqual(getLoginAuthority(session('wif', keyType), [keyType]), {
        kind: 'key',
        keyTypes: [keyType],
        canAddKey: false
      });
    });

    it(`hbauth holds the ${keyType} key it signed in with and can add the other`, () => {
      assert.deepEqual(getLoginAuthority(session('hbauth', keyType)), {
        kind: 'key',
        keyTypes: [keyType],
        canAddKey: true
      });
    });
  }

  it('hbauth holds every posting or active key in safe storage', () => {
    for (const keyType of ['posting', 'active']) {
      assert.deepEqual(getLoginAuthority(session('hbauth', keyType), ['active', 'owner', 'posting']), {
        kind: 'key',
        keyTypes: ['posting', 'active'],
        canAddKey: true
      });
    }
  });

  it('wif holds both keys when its key is stored as the posting and the active key', () => {
    for (const keyType of ['posting', 'active']) {
      assert.deepEqual(getLoginAuthority(session('wif', keyType), ['posting', 'active']), {
        kind: 'key',
        keyTypes: ['posting', 'active'],
        canAddKey: false
      });
    }
  });

  it('passkey holds the posting key its signer derives, and can add no other', () => {
    const postingOnly = { kind: 'key', keyTypes: ['posting'], canAddKey: false };
    assert.deepEqual(getLoginAuthority(session('passkey', 'posting')), postingOnly);
    assert.equal(lacksRequiredKeyType(session('passkey', 'posting'), 'active'), true);
    assert.equal(lacksRequiredKeyType(session('passkey', 'posting'), 'posting'), false);
  });

  for (const loginType of SIGNERS) {
    it(`${loginType} is a signer whatever key it signed in with`, () => {
      assert.deepEqual(getLoginAuthority(session(loginType, 'posting')), { kind: 'signer', loginType });
      assert.deepEqual(getLoginAuthority(session(loginType, 'active')), { kind: 'signer', loginType });
    });
  }
});

describe('missingKeyType', () => {
  it('names the key a session lacks', () => {
    assert.equal(missingKeyType(getLoginAuthority(session('hbauth', 'posting'))), 'active');
    assert.equal(missingKeyType(getLoginAuthority(session('wif', 'active'))), 'posting');
  });

  it('is null for a session holding both keys and for a signer', () => {
    assert.equal(missingKeyType(getLoginAuthority(session('hbauth', 'active'), ['posting'])), null);
    assert.equal(missingKeyType(getLoginAuthority(session('keychain', 'posting'))), null);
  });
});

describe('lacksRequiredKeyType', () => {
  it('refuses a posting session whose safe storage lacks the active key', () => {
    assert.equal(lacksRequiredKeyType(session('hbauth', 'posting'), 'active', ['posting']), true);
    assert.equal(lacksRequiredKeyType(session('hbauth', 'posting'), 'active'), true);
  });

  it('accepts a posting session whose safe storage holds the active key', () => {
    assert.equal(lacksRequiredKeyType(session('hbauth', 'posting'), 'active', ['posting', 'active']), false);
  });

  it('refuses a wif posting session whose key is stored as the posting key only', () => {
    assert.equal(lacksRequiredKeyType(session('wif', 'posting'), 'active', ['posting']), true);
    assert.equal(lacksRequiredKeyType(session('wif', 'posting'), 'active'), true);
  });

  it('accepts a wif session whose key is stored as both keys', () => {
    assert.equal(lacksRequiredKeyType(session('wif', 'posting'), 'active', ['posting', 'active']), false);
    assert.equal(lacksRequiredKeyType(session('wif', 'active'), 'posting', ['posting', 'active']), false);
  });

  it('accepts a posting session of a signer holding every key', () => {
    for (const loginType of SIGNERS) assert.equal(lacksRequiredKeyType(session(loginType, 'posting'), 'active'), false);
  });

  it('accepts an active session, any session when no key is required, and no session', () => {
    assert.equal(lacksRequiredKeyType(session('hbauth', 'active'), 'active'), false);
    assert.equal(lacksRequiredKeyType(session('wif', 'posting'), undefined), false);
    assert.equal(lacksRequiredKeyType(session('hbauth', 'posting', false), 'active'), false);
  });
});

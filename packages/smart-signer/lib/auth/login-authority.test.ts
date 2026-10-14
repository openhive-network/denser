import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@smart-signer/types/common';
import { getLoginAuthority } from './login-authority.ts';

// Values of LoginType and KeyType: the enums cannot load under type stripping
const session = (loginType: string, keyType: string) => ({
  loginType: loginType as User['loginType'],
  keyType: keyType as User['keyType']
});

describe('getLoginAuthority', () => {
  for (const loginType of ['hbauth', 'wif']) {
    for (const keyType of ['posting', 'active']) {
      it(`${loginType} holds the ${keyType} key it signed in with`, () => {
        assert.deepEqual(getLoginAuthority(session(loginType, keyType)), { kind: 'key', keyType });
      });
    }
  }

  for (const loginType of ['keychain', 'peakvault', 'metamask', 'google', 'hiveauth', 'hivesigner']) {
    it(`${loginType} is a signer whatever key it signed in with`, () => {
      assert.deepEqual(getLoginAuthority(session(loginType, 'posting')), { kind: 'signer', loginType });
      assert.deepEqual(getLoginAuthority(session(loginType, 'active')), { kind: 'signer', loginType });
    });
  }
});

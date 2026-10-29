import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { LoginType } from '@smart-signer/types/common';
import { canSignBinaryChallenge } from './binary-challenge.ts';

// LoginType is a runtime enum, which node's type stripping can't load here.
const loginType = (value: string): LoginType => value as LoginType;

describe('canSignBinaryChallenge', () => {
  it('rejects Peak Vault, whose extension signs only string buffers', () => {
    assert.equal(canSignBinaryChallenge(loginType('peakvault')), false);
  });

  it('accepts signers that sign binary buffers', () => {
    for (const type of ['keychain', 'hbauth', 'wif', 'metamask']) {
      assert.equal(canSignBinaryChallenge(loginType(type)), true, type);
    }
  });
});

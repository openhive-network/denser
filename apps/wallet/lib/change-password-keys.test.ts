import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RoleAuthority } from './authority-checks.ts';
import {
  CredentialError,
  credentialKind,
  currentPublicKeys,
  passwordChange,
  roleAuthoritiesOf,
  type ChangedRole,
  type KeyDerivation
} from './change-password-keys.ts';

// Stands in for wax: a private key is `WIF:<public key>`, a password derives `WIF:PUB_<role>_<password>`
const derivation: KeyDerivation = {
  publicKeyOf: (wif) => {
    if (!wif.startsWith('WIF:')) throw new Error('not a private key');
    return wif.slice('WIF:'.length);
  },
  keyFromPassword: (_username, role, password) => ({
    wifPrivateKey: `WIF:PUB_${role}_${password}`,
    associatedPublicKey: `PUB_${role}_${password}`
  })
};

const role = (level: ChangedRole, keys: string[]): RoleAuthority => ({
  level,
  key_auths: keys.map((keyOrAccount) => ({ keyOrAccount, thresholdWeight: 1 })),
  account_auths: [],
  weight_threshold: 1
});

const MASTER_ACCOUNT = [
  role('owner', ['PUB_owner_old']),
  role('active', ['PUB_active_old']),
  role('posting', ['PUB_posting_old'])
];

const refusal = (code: string, role: string) => (error: unknown) =>
  error instanceof CredentialError && error.code === code && error.role === role;

describe('credentialKind', () => {
  it('reads a private key as the owner key and anything else as the master password', () => {
    assert.equal(credentialKind('WIF:PUB_owner_old', derivation), 'owner_key');
    assert.equal(credentialKind('P5old', derivation), 'master_password');
  });
});

describe('currentPublicKeys', () => {
  it('derives every role key from the master password', () => {
    assert.deepEqual(currentPublicKeys('alice', 'old', MASTER_ACCOUNT, derivation), {
      owner: 'PUB_owner_old',
      active: 'PUB_active_old',
      posting: 'PUB_posting_old'
    });
  });

  it('refuses a master password one of whose keys the account does not hold', () => {
    assert.throws(() => currentPublicKeys('alice', 'wrong', MASTER_ACCOUNT, derivation), refusal('wrong_password', 'owner'));
    const changedActive = [MASTER_ACCOUNT[0], role('active', ['PUB_active_other']), MASTER_ACCOUNT[2]];
    assert.throws(() => currentPublicKeys('alice', 'old', changedActive, derivation), refusal('wrong_password', 'active'));
  });

  it('builds the same replacements from the owner private key as from the master password', () => {
    const fromOwnerKey = currentPublicKeys('alice', 'WIF:PUB_owner_old', MASTER_ACCOUNT, derivation);
    assert.deepEqual(fromOwnerKey, currentPublicKeys('alice', 'old', MASTER_ACCOUNT, derivation));
    assert.deepEqual(
      passwordChange('alice', fromOwnerKey, 'new', derivation, false),
      passwordChange('alice', currentPublicKeys('alice', 'old', MASTER_ACCOUNT, derivation), 'new', derivation, false)
    );
  });

  it('refuses a private key that is not the owner key', () => {
    assert.throws(
      () => currentPublicKeys('alice', 'WIF:PUB_active_old', MASTER_ACCOUNT, derivation),
      refusal('not_owner_key', 'owner')
    );
  });

  it('refuses the owner key when a role holds several keys, as which to replace is unknown', () => {
    const twoPostingKeys = [MASTER_ACCOUNT[0], MASTER_ACCOUNT[1], role('posting', ['PUB_posting_old', 'PUB_app'])];
    assert.throws(
      () => currentPublicKeys('alice', 'WIF:PUB_owner_old', twoPostingKeys, derivation),
      refusal('role_not_single_key', 'posting')
    );
  });
});

describe('passwordChange', () => {
  const current = { owner: 'PUB_owner_old', active: 'PUB_active_old', posting: 'PUB_posting_old' };

  it('replaces every role key with the one the new password derives', () => {
    assert.deepEqual(passwordChange('alice', current, 'new', derivation, false), {
      account: 'alice',
      keys: {
        owner: { old: 'PUB_owner_old', new: 'PUB_owner_new' },
        active: { old: 'PUB_active_old', new: 'PUB_active_new' },
        posting: { old: 'PUB_posting_old', new: 'PUB_posting_new' }
      },
      wifs: { owner: 'WIF:PUB_owner_new', active: 'WIF:PUB_active_new', posting: 'WIF:PUB_posting_new' }
    });
  });

  it('keeps the posting key when asked to', () => {
    const change = passwordChange('alice', current, 'new', derivation, true);
    assert.deepEqual(Object.keys(change.keys), ['owner', 'active']);
    assert.deepEqual(Object.keys(change.wifs), ['owner', 'active']);
  });
});

describe('roleAuthoritiesOf', () => {
  it("reads a chain account's owner, active and posting authorities", () => {
    const authority = (key: string) => ({ weight_threshold: 1, account_auths: [['friend', 1]] as [string, number][], key_auths: [[key, 1]] as [string, number][] });
    assert.deepEqual(
      roleAuthoritiesOf({ owner: authority('PUB_o'), active: authority('PUB_a'), posting: authority('PUB_p') }).map(
        ({ level, key_auths, account_auths }) => [level, key_auths[0].keyOrAccount, account_auths[0].keyOrAccount]
      ),
      [
        ['owner', 'PUB_o', 'friend'],
        ['active', 'PUB_a', 'friend'],
        ['posting', 'PUB_p', 'friend']
      ]
    );
  });
});

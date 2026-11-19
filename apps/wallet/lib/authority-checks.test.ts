import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  authorityProblems,
  lockoutRisks,
  rolesLosingKeys,
  signingKeysIn,
  type RoleAuthority
} from './authority-checks.ts';

const role = (
  level: string,
  keys: [string, number][],
  threshold = 1,
  accounts: [string, number][] = []
): RoleAuthority => ({
  level,
  key_auths: keys.map(([keyOrAccount, thresholdWeight]) => ({ keyOrAccount, thresholdWeight })),
  account_auths: accounts.map(([keyOrAccount, thresholdWeight]) => ({ keyOrAccount, thresholdWeight })),
  weight_threshold: threshold
});

const ACCOUNT = [role('owner', [['STM_OWNER', 1]]), role('active', [['STM_ACTIVE', 1]]), role('posting', [['STM_POSTING', 1], ['STM_APP', 1]])];

describe('signingKeysIn', () => {
  it('marks the public keys the signer is known to sign with', () => {
    assert.deepEqual([...signingKeysIn(ACCOUNT, { publicKeys: ['STM_APP', 'STM_ELSEWHERE'], roles: [] })], ['STM_APP']);
  });

  it("marks the only key of a role the signer signs for without knowing the key", () => {
    assert.deepEqual([...signingKeysIn(ACCOUNT, { publicKeys: [], roles: ['active'] })], ['STM_ACTIVE']);
  });

  it('marks no key of a role with several keys when none is known', () => {
    assert.deepEqual([...signingKeysIn(ACCOUNT, { publicKeys: [], roles: ['posting'] })], []);
  });

  it('does not fall back to the role when the known key is not among its keys', () => {
    assert.deepEqual([...signingKeysIn(ACCOUNT, { publicKeys: ['STM_OLD_ACTIVE'], roles: [] })], []);
  });
});

describe('authorityProblems', () => {
  it('accepts roles whose weights reach their thresholds', () => {
    assert.deepEqual(authorityProblems(ACCOUNT), []);
    assert.deepEqual(authorityProblems([role('active', [['STM_A', 1]], 2, [['friend', 1]])]), []);
  });

  it('refuses a threshold the remaining weights cannot reach, keys and accounts counted', () => {
    assert.deepEqual(authorityProblems([role('active', [['STM_A', 1]], 3, [['friend', 1]])]), [
      { kind: 'unreachable_threshold', level: 'active', threshold: 3, total: 2 }
    ]);
    assert.deepEqual(authorityProblems([role('posting', [], 1)]), [
      { kind: 'unreachable_threshold', level: 'posting', threshold: 1, total: 0 }
    ]);
  });

  it('refuses an owner role without any key or account', () => {
    assert.deepEqual(authorityProblems([role('owner', [], 1)]), [{ kind: 'owner_empty', level: 'owner' }]);
  });
});

describe('lockoutRisks', () => {
  const sessionKeys = new Set(['STM_POSTING']);
  const passkeyKeys = new Set(['STM_APP']);
  const without = (key: string) =>
    ACCOUNT.map((r) => ({ ...r, key_auths: r.key_auths.filter(({ keyOrAccount }) => keyOrAccount !== key) }));

  it("warns before removing the session's key", () => {
    assert.deepEqual(
      lockoutRisks({ before: ACCOUNT, after: without('STM_POSTING'), sessionKeys, passkeyKeys, externalWallet: false }),
      ['session_key']
    );
  });

  it("warns before replacing the session's key with another one", () => {
    const after = ACCOUNT.map((r) =>
      r.level === 'posting' ? role('posting', [['STM_NEW', 1], ['STM_APP', 1]]) : r
    );
    assert.deepEqual(lockoutRisks({ before: ACCOUNT, after, sessionKeys, passkeyKeys, externalWallet: false }), [
      'session_key'
    ]);
  });

  it("warns before removing the passkey signer's posting key", () => {
    assert.deepEqual(
      lockoutRisks({ before: ACCOUNT, after: without('STM_APP'), sessionKeys, passkeyKeys, externalWallet: false }),
      ['passkey_key']
    );
  });

  it('warns a session signing with an external wallet before removing any key', () => {
    assert.deepEqual(
      lockoutRisks({ before: ACCOUNT, after: without('STM_ACTIVE'), sessionKeys, passkeyKeys, externalWallet: true }),
      ['wallet_keys']
    );
  });

  it('does not warn about a change that removes no key', () => {
    const after = ACCOUNT.map((r) => (r.level === 'active' ? role('active', [['STM_ACTIVE', 1], ['STM_ADDED', 1]]) : r));
    assert.deepEqual(lockoutRisks({ before: ACCOUNT, after, sessionKeys, passkeyKeys, externalWallet: true }), []);
    assert.deepEqual(
      lockoutRisks({ before: ACCOUNT, after: without('STM_ACTIVE'), sessionKeys, passkeyKeys, externalWallet: false }),
      []
    );
  });
});

describe('lockoutRisks of the owner threshold', () => {
  const none = new Set<string>();
  const withOwnerThreshold = (threshold: number) =>
    ACCOUNT.map((r) => (r.level === 'owner' ? { ...r, weight_threshold: threshold } : r));

  it('warns before raising the owner threshold above 1', () => {
    assert.deepEqual(
      lockoutRisks({ before: ACCOUNT, after: withOwnerThreshold(2), sessionKeys: none, passkeyKeys: none, externalWallet: false }),
      ['owner_threshold']
    );
  });

  it('does not warn about an owner threshold of 1, or one left as it was', () => {
    const raised = withOwnerThreshold(2);
    assert.deepEqual(
      lockoutRisks({ before: raised, after: ACCOUNT, sessionKeys: none, passkeyKeys: none, externalWallet: false }),
      []
    );
    assert.deepEqual(
      lockoutRisks({ before: raised, after: raised, sessionKeys: none, passkeyKeys: none, externalWallet: false }),
      []
    );
  });
});

describe('rolesLosingKeys', () => {
  it('names the roles a held key is removed from', () => {
    const after = ACCOUNT.map((r) => (r.level === 'active' ? role('active', [['STM_NEW', 1]]) : r));
    assert.deepEqual(rolesLosingKeys(ACCOUNT, after, new Set(['STM_ACTIVE', 'STM_POSTING'])), ['active']);
    assert.deepEqual(rolesLosingKeys(ACCOUNT, ACCOUNT, new Set(['STM_ACTIVE'])), []);
  });
});

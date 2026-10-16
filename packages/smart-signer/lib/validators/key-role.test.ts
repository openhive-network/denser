import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { findKeyRole, findKeyRoles, type AccountAuthorities } from './key-role.ts';

const OWNER_KEY = 'STM8OwnerKeyOfTheStubAccount';
const ACTIVE_KEY = 'STM7ActiveKeyOfTheStubAccount';
const POSTING_KEY = 'STM6PostingKeyOfTheStubAccount';
const OTHER_KEY = 'STM5KeyOfNoAuthorityOfTheAccount';

const authority = (...keys: string[]) => ({
  weight_threshold: 1,
  account_auths: [],
  key_auths: keys.map((key): [string, number] => [key, 1])
});

const account: AccountAuthorities = {
  owner: authority(OWNER_KEY),
  active: authority(ACTIVE_KEY),
  posting: authority(POSTING_KEY)
};

describe('findKeyRole', () => {
  it('finds the posting key', () => {
    assert.equal(findKeyRole(account, POSTING_KEY), 'posting');
  });

  it('finds the active key', () => {
    assert.equal(findKeyRole(account, ACTIVE_KEY), 'active');
  });

  it('finds the owner key', () => {
    assert.equal(findKeyRole(account, OWNER_KEY), 'owner');
  });

  it('returns null for a key of no authority', () => {
    assert.equal(findKeyRole(account, OTHER_KEY), null);
  });

  it('reports the strongest role of a key held by several authorities', () => {
    const shared = { ...account, active: authority(ACTIVE_KEY, POSTING_KEY) };
    assert.equal(findKeyRole(shared, POSTING_KEY), 'active');
  });
});

describe('findKeyRoles', () => {
  it('finds the one role of a key held by one authority', () => {
    assert.deepEqual(findKeyRoles(account, POSTING_KEY), ['posting']);
    assert.deepEqual(findKeyRoles(account, ACTIVE_KEY), ['active']);
  });

  it('finds every role of a key that is both the posting and the active key, strongest first', () => {
    const shared = { ...account, active: authority(POSTING_KEY), posting: authority(OTHER_KEY, POSTING_KEY) };
    assert.deepEqual(findKeyRoles(shared, POSTING_KEY), ['active', 'posting']);
  });

  it('finds the owner role next to the others', () => {
    const single = { owner: authority(OWNER_KEY), active: authority(OWNER_KEY), posting: authority(OWNER_KEY) };
    assert.deepEqual(findKeyRoles(single, OWNER_KEY), ['owner', 'active', 'posting']);
  });

  it('is empty for a key of no authority', () => {
    assert.deepEqual(findKeyRoles(account, OTHER_KEY), []);
  });
});

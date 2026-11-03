import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  areOwnKeys,
  classifyKeyRefusal,
  findKeyRole,
  findKeyRoles,
  isKeyOfOtherRole,
  type AccountAuthorities
} from './key-role.ts';

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
    const single = {
      owner: authority(OWNER_KEY),
      active: authority(OWNER_KEY),
      posting: authority(OWNER_KEY)
    };
    assert.deepEqual(findKeyRoles(single, OWNER_KEY), ['owner', 'active', 'posting']);
  });

  it('is empty for a key of no authority', () => {
    assert.deepEqual(findKeyRoles(account, OTHER_KEY), []);
  });
});

describe('isKeyOfOtherRole', () => {
  it('refuses the posting key as the active key', () => {
    assert.equal(isKeyOfOtherRole(account, POSTING_KEY, 'active'), true);
  });

  it('accepts the active and owner keys as the active key', () => {
    assert.equal(isKeyOfOtherRole(account, ACTIVE_KEY, 'active'), false);
    assert.equal(isKeyOfOtherRole(account, OWNER_KEY, 'active'), false);
  });

  it('refuses the active and owner keys as the posting key', () => {
    assert.equal(isKeyOfOtherRole(account, ACTIVE_KEY, 'posting'), true);
    assert.equal(isKeyOfOtherRole(account, OWNER_KEY, 'posting'), true);
  });

  it('accepts the posting key as the posting key', () => {
    assert.equal(isKeyOfOtherRole(account, POSTING_KEY, 'posting'), false);
  });

  it('accepts a key that is both the posting and the active key for either role', () => {
    const shared = { ...account, active: authority(POSTING_KEY) };
    assert.equal(isKeyOfOtherRole(shared, POSTING_KEY, 'posting'), false);
    assert.equal(isKeyOfOtherRole(shared, POSTING_KEY, 'active'), false);
  });

  it('leaves a key of no authority to the on-chain verification', () => {
    assert.equal(isKeyOfOtherRole(account, OTHER_KEY, 'posting'), false);
    assert.equal(isKeyOfOtherRole(account, OTHER_KEY, 'active'), false);
  });
});

describe('areOwnKeys', () => {
  it('accepts a key of one of the account authorities', () => {
    assert.equal(areOwnKeys(account, [POSTING_KEY]), true);
    assert.equal(areOwnKeys(account, [OWNER_KEY]), true);
  });

  it('rejects a key of no authority of the account, such as an authority account key', () => {
    assert.equal(areOwnKeys(account, [OTHER_KEY]), false);
  });

  it('rejects keys of which any one is not the account own', () => {
    assert.equal(areOwnKeys(account, [ACTIVE_KEY, OTHER_KEY]), false);
  });

  it('rejects no keys at all', () => {
    assert.equal(areOwnKeys(account, []), false);
  });
});

describe('classifyKeyRefusal', () => {
  const ACCOUNT = 'guest4test2';
  const AUTHORISED = 'guest4test1';
  const UNRELATED = 'guest4test3';
  const HOLDER_ACTIVE_KEY = 'STM5ActiveKeyOfTheHolder';
  const HOLDER_POSTING_KEY = 'STM4PostingKeyOfTheHolder';
  const named = { ...account, name: ACCOUNT };
  const delegatingActive = {
    ...named,
    active: {
      ...authority(ACTIVE_KEY),
      account_auths: [AUTHORISED].map((name): [string, number] => [name, 1])
    }
  };
  const holder = (name: string) => ({
    name,
    owner: authority('STM3OwnerKeyOfTheHolder'),
    active: authority(HOLDER_ACTIVE_KEY),
    posting: authority(HOLDER_POSTING_KEY)
  });
  const authorised = holder(AUTHORISED);
  const unrelated = holder(UNRELATED);

  it("refuses the account's own key of another role, whoever else holds it", () => {
    assert.deepEqual(classifyKeyRefusal(named, POSTING_KEY, 'active', [unrelated]), {
      kind: 'own-other-role'
    });
    assert.deepEqual(classifyKeyRefusal(named, ACTIVE_KEY, 'posting', []), { kind: 'own-other-role' });
  });

  it("accepts the account's own key of the role asked for", () => {
    assert.equal(classifyKeyRefusal(named, ACTIVE_KEY, 'active', [unrelated]), null);
  });

  it("names the holder the role's authority lists in account_auths, for the holder's key of that role", () => {
    assert.deepEqual(classifyKeyRefusal(delegatingActive, HOLDER_ACTIVE_KEY, 'active', [authorised]), {
      kind: 'authorised-account',
      owner: AUTHORISED
    });
  });

  it("names a listed holder as unrelated for the holder's key of another role", () => {
    assert.deepEqual(classifyKeyRefusal(delegatingActive, HOLDER_POSTING_KEY, 'active', [authorised]), {
      kind: 'unrelated-account',
      owner: AUTHORISED
    });
  });

  it('prefers an authorised holder over an unrelated one', () => {
    assert.deepEqual(
      classifyKeyRefusal(delegatingActive, HOLDER_ACTIVE_KEY, 'active', [unrelated, authorised]),
      { kind: 'authorised-account', owner: AUTHORISED }
    );
  });

  it('names a holder only another role lists as unrelated', () => {
    assert.deepEqual(classifyKeyRefusal(delegatingActive, HOLDER_POSTING_KEY, 'posting', [authorised]), {
      kind: 'unrelated-account',
      owner: AUTHORISED
    });
  });

  it('names a holder of no authority over the account as unrelated', () => {
    assert.deepEqual(classifyKeyRefusal(named, HOLDER_ACTIVE_KEY, 'active', [unrelated]), {
      kind: 'unrelated-account',
      owner: UNRELATED
    });
  });

  it('leaves a key nobody else is known to hold unclassified', () => {
    assert.equal(classifyKeyRefusal(named, OTHER_KEY, 'active', []), null);
    assert.equal(classifyKeyRefusal(named, OTHER_KEY, 'active', [{ ...named }]), null);
  });
});

import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  forgetAllTabCredentials,
  forgetDriveEncryptionKey,
  forgetTabCredentials,
  forgetTabWifKeys,
  getDriveEncryptionKey,
  getTabWif,
  rememberDriveEncryptionKey,
  rememberTabWif,
  tabWifKeyTypes
} from './tab-credentials.ts';

beforeEach(forgetAllTabCredentials);

describe('tab WIF keys', () => {
  it('keeps a key per account and key type', () => {
    rememberTabWif('alice', ['posting'], 'alice-posting');
    rememberTabWif('alice', ['active'], 'alice-active');
    rememberTabWif('alice2', ['posting'], 'alice2-posting');

    assert.equal(getTabWif('alice', 'posting'), 'alice-posting');
    assert.equal(getTabWif('alice', 'active'), 'alice-active');
    assert.equal(getTabWif('alice2', 'posting'), 'alice2-posting');
    assert.equal(getTabWif('alice2', 'active'), null);
  });

  it('names the key types one shared key is kept as', () => {
    rememberTabWif('alice', ['posting', 'active'], 'shared');
    rememberTabWif('bob', ['posting'], 'bob-posting');
    rememberTabWif('bob', ['active'], 'bob-active');

    assert.deepEqual(tabWifKeyTypes('alice', 'active'), ['posting', 'active']);
    assert.deepEqual(tabWifKeyTypes('bob', 'posting'), ['posting']);
    assert.deepEqual(tabWifKeyTypes('carol', 'posting'), []);
  });
});

describe('forgetting', () => {
  it('forgets every secret of one account and keeps the others', () => {
    rememberTabWif('alice', ['posting', 'active'], 'alice-key');
    rememberDriveEncryptionKey('alice', 'alice-drive');
    rememberTabWif('alice2', ['posting'], 'alice2-key');
    rememberDriveEncryptionKey('alice2', 'alice2-drive');

    forgetTabCredentials('alice');

    assert.equal(getTabWif('alice', 'posting'), null);
    assert.equal(getTabWif('alice', 'active'), null);
    assert.equal(getDriveEncryptionKey('alice'), null);
    assert.equal(getTabWif('alice2', 'posting'), 'alice2-key');
    assert.equal(getDriveEncryptionKey('alice2'), 'alice2-drive');
  });

  it('forgets the WIF keys of one account alone, keeping its Drive key', () => {
    rememberTabWif('alice', ['posting', 'active'], 'alice-key');
    rememberDriveEncryptionKey('alice', 'alice-drive');
    rememberTabWif('alice2', ['posting'], 'alice2-key');

    forgetTabWifKeys('alice');

    assert.equal(getTabWif('alice', 'posting'), null);
    assert.equal(getTabWif('alice', 'active'), null);
    assert.equal(getDriveEncryptionKey('alice'), 'alice-drive');
    assert.equal(getTabWif('alice2', 'posting'), 'alice2-key');
  });

  it('forgets the Drive key alone, or everything of every account', () => {
    rememberTabWif('alice', ['posting'], 'alice-key');
    rememberDriveEncryptionKey('alice', 'alice-drive');
    rememberDriveEncryptionKey('bob', 'bob-drive');

    forgetDriveEncryptionKey('alice');
    assert.equal(getDriveEncryptionKey('alice'), null);
    assert.equal(getTabWif('alice', 'posting'), 'alice-key');

    forgetAllTabCredentials();
    assert.equal(getTabWif('alice', 'posting'), null);
    assert.equal(getDriveEncryptionKey('bob'), null);
  });
});

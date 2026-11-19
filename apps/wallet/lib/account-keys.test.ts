import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isOwnAccount, keyChangeFollowUp, loginMethodOf, needsWalletUpdate } from './account-keys.ts';

describe('isOwnAccount', () => {
  it("is the signed-in user's own account page only", () => {
    assert.equal(isOwnAccount({ isLoggedIn: true, username: 'guest4test' }, 'guest4test'), true);
    assert.equal(isOwnAccount({ isLoggedIn: true, username: 'guest4test' }, 'blocktrades'), false);
  });

  it('is nobody\'s while signed out, even with a stored username', () => {
    assert.equal(isOwnAccount({ isLoggedIn: false, username: 'guest4test' }, 'guest4test'), false);
    assert.equal(isOwnAccount({ isLoggedIn: false, username: '' }, ''), false);
  });
});

describe('loginMethodOf', () => {
  it('tells where each login type keeps its keys', () => {
    assert.equal(loginMethodOf('wif'), 'wif');
    assert.equal(loginMethodOf('hbauth'), 'safe_storage');
    for (const wallet of ['keychain', 'peakvault', 'metamask'] as const) {
      assert.equal(loginMethodOf(wallet), 'external_wallet');
    }
    assert.equal(loginMethodOf('hiveauth'), 'hiveauth');
    assert.equal(loginMethodOf('google'), 'google');
    assert.equal(loginMethodOf('passkey'), 'passkey');
  });
});

describe('keyChangeFollowUp', () => {
  it('asks to update the keys in an external wallet or HiveAuth app', () => {
    for (const wallet of ['keychain', 'peakvault', 'metamask', 'hiveauth'] as const) {
      assert.equal(keyChangeFollowUp(wallet), 'update_wallet');
      assert.equal(needsWalletUpdate(keyChangeFollowUp(wallet)), true);
    }
  });

  it('asks to update the Google Drive wallet in Hive Bridge', () => {
    assert.equal(keyChangeFollowUp('google'), 'update_google_drive');
    assert.equal(needsWalletUpdate('update_google_drive'), true);
  });

  it('warns that a passkey loses its posting key, and that safe storage is replaced by the app', () => {
    assert.equal(keyChangeFollowUp('passkey'), 'passkey_lost');
    assert.equal(keyChangeFollowUp('hbauth'), 'safe_storage_replaced');
    assert.equal(needsWalletUpdate('passkey_lost'), false);
    assert.equal(needsWalletUpdate('safe_storage_replaced'), false);
  });

  it('asks nothing of a key typed in', () => {
    assert.equal(keyChangeFollowUp('wif'), 'none');
    assert.equal(needsWalletUpdate('none'), false);
  });
});

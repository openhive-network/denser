import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@smart-signer/types/common';
import { addAccount, removeAccount, findAccount, replaceAccount, setSessionUser, MAX_ACCOUNTS } from './accounts.ts';

function account(username: string, isLoggedIn = true): User {
  return {
    isLoggedIn,
    username,
    avatarUrl: '',
    // Values of LoginType.keychain and KeyType.posting: the enums cannot load under type stripping
    loginType: 'keychain' as User['loginType'],
    keyType: 'posting' as User['keyType'],
    authenticateOnBackend: true,
    chatAuthToken: '',
    oauthConsent: {},
    strict: true
  };
}

const usernames = (accounts: User[]) => accounts.map((a) => a.username);

describe('addAccount', () => {
  it('starts a new list when signing in while logged out', () => {
    const stale = [account('alice'), account('bob')];
    assert.deepEqual(usernames(addAccount(stale, account('', false), account('carol'))), ['carol']);
    assert.deepEqual(usernames(addAccount(stale, undefined, account('carol'))), ['carol']);
  });

  it('adds to the list when signing in while logged in', () => {
    const accounts = [account('alice')];
    assert.deepEqual(usernames(addAccount(accounts, account('alice'), account('bob'))), ['alice', 'bob']);
  });

  it('keeps the current user when the list does not hold it yet', () => {
    assert.deepEqual(usernames(addAccount([], account('alice'), account('bob'))), ['alice', 'bob']);
  });

  it('replaces an account signing in again in place, with its new data', () => {
    const accounts = [account('alice'), account('bob')];
    const bobAgain = { ...account('bob'), strict: false };
    const next = addAccount(accounts, account('alice'), bobAgain);
    assert.deepEqual(usernames(next), ['alice', 'bob']);
    assert.equal(next[1], bobAgain);
  });

  it('drops the oldest accounts past the limit, never the one signing in', () => {
    const accounts = Array.from({ length: MAX_ACCOUNTS }, (_, i) => account(`user${i}`));
    const next = addAccount(accounts, accounts[MAX_ACCOUNTS - 1], account('newcomer'));
    assert.equal(next.length, MAX_ACCOUNTS);
    assert.equal(findAccount(next, 'user0'), undefined);
    assert.equal(next[next.length - 1].username, 'newcomer');
  });
});

describe('removeAccount', () => {
  it('removes only the named account', () => {
    const accounts = [account('alice'), account('bob'), account('carol')];
    assert.deepEqual(usernames(removeAccount(accounts, 'bob')), ['alice', 'carol']);
    assert.deepEqual(usernames(removeAccount(accounts, 'dave')), ['alice', 'bob', 'carol']);
  });
});

describe('replaceAccount', () => {
  it('replaces the account listed under the same username, and adds none', () => {
    const accounts = [account('alice'), account('bob')];
    const bobAgain = { ...account('bob'), strict: false };
    assert.deepEqual(replaceAccount(accounts, bobAgain), [accounts[0], bobAgain]);
    assert.deepEqual(usernames(replaceAccount(accounts, account('carol'))), ['alice', 'bob']);
  });
});

describe('setSessionUser', () => {
  /** What `/api/auth/switch` does with a session holding the account. */
  function switchTo(session: { user?: User; accounts?: User[] }, username: string) {
    const target = findAccount(session.accounts ?? [], username);
    assert.ok(target, `${username} is remembered`);
    setSessionUser(session, target);
  }

  it('keeps a change to the current user when switching away and back', () => {
    const alice = { ...account('alice'), oauthConsent: { chat: true } };
    const session = { user: alice, accounts: [alice, account('bob')] };

    setSessionUser(session, { ...alice, oauthConsent: { chat: false } });
    switchTo(session, 'bob');
    switchTo(session, 'alice');

    assert.equal(session.user.username, 'alice');
    assert.deepEqual(session.user.oauthConsent, { chat: false });
  });

  it('sets the user of a session that remembers no accounts', () => {
    const session: { user?: User; accounts?: User[] } = {};
    setSessionUser(session, account('alice'));
    assert.equal(session.user?.username, 'alice');
    assert.deepEqual(session.accounts, []);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@smart-signer/types/common';
import {
  addAccount,
  droppedAccounts,
  removeAccount,
  findAccount,
  replaceAccount,
  sessionAccounts,
  setSessionUser,
  MAX_ACCOUNTS
} from './accounts.ts';

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

describe('droppedAccounts', () => {
  it('names the previous list when signing in while logged out, but not the account signing in', () => {
    const stale = [account('alice'), account('bob'), account('carol')];
    const next = addAccount(stale, account('', false), account('bob'));
    assert.deepEqual(usernames(droppedAccounts(stale, account('', false), next)), ['alice', 'carol']);
    assert.deepEqual(usernames(droppedAccounts(stale, undefined, next)), ['alice', 'carol']);
  });

  it('names the oldest account dropped past the limit', () => {
    const accounts = Array.from({ length: MAX_ACCOUNTS }, (_, i) => account(`user${i}`));
    const current = accounts[MAX_ACCOUNTS - 1];
    const next = addAccount(accounts, current, account('newcomer'));
    assert.deepEqual(usernames(droppedAccounts(accounts, current, next)), ['user0']);
  });

  it('names the current user when the list did not hold it and it is dropped', () => {
    const accounts = Array.from({ length: MAX_ACCOUNTS }, (_, i) => account(`user${i}`));
    const next = [...accounts.slice(1), account('newcomer')];
    assert.deepEqual(usernames(droppedAccounts(accounts, account('outsider'), next)), ['user0', 'outsider']);
  });

  it('names none while the list grows below the limit or an account signs in again', () => {
    const accounts = [account('alice'), account('bob')];
    assert.deepEqual(droppedAccounts(accounts, accounts[0], addAccount(accounts, accounts[0], account('carol'))), []);
    assert.deepEqual(droppedAccounts(accounts, accounts[0], addAccount(accounts, accounts[0], account('bob'))), []);
  });
});

describe('removeAccount', () => {
  it('removes only the named account', () => {
    const accounts = [account('alice'), account('bob'), account('carol')];
    assert.deepEqual(usernames(removeAccount(accounts, 'bob')), ['alice', 'carol']);
    assert.deepEqual(usernames(removeAccount(accounts, 'dave')), ['alice', 'bob', 'carol']);
  });
});

describe('sessionAccounts', () => {
  it('adds the user to the remembered accounts only when they do not list it', () => {
    const accounts = [account('alice'), account('bob')];
    assert.deepEqual(usernames(sessionAccounts(accounts, account('carol'))), ['alice', 'bob', 'carol']);
    assert.equal(sessionAccounts(accounts, account('bob')), accounts);
    assert.deepEqual(usernames(sessionAccounts([], account('alice'))), ['alice']);
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

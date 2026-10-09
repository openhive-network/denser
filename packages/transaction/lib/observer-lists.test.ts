import { afterEach, beforeEach, describe, it } from 'mocha';
import { expect } from 'chai';
import {
  fetchHasOwnLists,
  getEffectiveObserver,
  NO_OWN_LISTS_COOKIE,
  OWN_LISTS_TTL_MS,
  readOwnLists,
  refreshOwnLists,
  subscribeOwnLists,
  updateOwnListsAfterChange,
  type IObserverListsApi
} from './observer-lists';

const DEFAULT_OBSERVER = 'hive.blog';

class MemoryStorage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

const browser = globalThis as unknown as { window?: unknown; document?: { cookie: string } };

const api = (lists: { muted?: string[]; blacklisted?: string[]; followsLists?: boolean } = {}) => {
  const calls: string[] = [];
  const fake: IObserverListsApi = {
    getFollowList: async (observer, followType) => {
      calls.push(`${followType}:${observer}`);
      return (followType === 'muted' ? lists.muted : lists.blacklisted) ?? [];
    },
    doesUserFollowAnyLists: async (observer) => {
      calls.push(`follows:${observer}`);
      return lists.followsLists ?? false;
    }
  };
  return { fake, calls };
};

describe('getEffectiveObserver', () => {
  it('is the default observer when logged out', () => {
    expect(getEffectiveObserver('', null)).to.equal(DEFAULT_OBSERVER);
    expect(getEffectiveObserver('', true)).to.equal(DEFAULT_OBSERVER);
  });

  it('is the default observer only for an account known to have no lists of its own', () => {
    expect(getEffectiveObserver('alice', false)).to.equal(DEFAULT_OBSERVER);
    expect(getEffectiveObserver('alice', true)).to.equal('alice');
    expect(getEffectiveObserver('alice', null)).to.equal('alice');
  });
});

describe('fetchHasOwnLists', () => {
  it('asks for the account’s mutes, blacklist and followed lists', async () => {
    const { fake, calls } = api();
    expect(await fetchHasOwnLists('alice', fake)).to.equal(false);
    expect(calls.sort()).to.deep.equal(['blacklisted:alice', 'follows:alice', 'muted:alice']);
  });

  it('finds lists of its own in any of the three', async () => {
    expect(await fetchHasOwnLists('alice', api({ muted: ['spammer'] }).fake)).to.equal(true);
    expect(await fetchHasOwnLists('alice', api({ blacklisted: ['spammer'] }).fake)).to.equal(true);
    expect(await fetchHasOwnLists('alice', api({ followsLists: true }).fake)).to.equal(true);
  });
});

describe('stored answer', () => {
  let realNow: () => number;
  let clock: number;

  beforeEach(() => {
    browser.window = { localStorage: new MemoryStorage(), location: { protocol: 'http:' } };
    browser.document = { cookie: '' };
    realNow = Date.now;
    clock = 1_000_000;
    Date.now = () => clock;
  });

  afterEach(() => {
    Date.now = realNow;
    delete browser.window;
    delete browser.document;
  });

  it('is unknown before the account is checked', () => {
    expect(readOwnLists('alice')).to.equal(null);
  });

  it('remembers an account without lists and names it in the server-side cookie', async () => {
    let notified = 0;
    const unsubscribe = subscribeOwnLists(() => notified++);
    await refreshOwnLists('alice', api().fake);
    unsubscribe();

    expect(readOwnLists('alice')).to.equal(false);
    expect(readOwnLists('bob')).to.equal(null);
    expect(browser.document?.cookie).to.match(new RegExp(`^${NO_OWN_LISTS_COOKIE}=alice;`));
    expect(notified).to.equal(1);
  });

  it('clears the cookie for an account with lists', async () => {
    await refreshOwnLists('alice', api({ muted: ['spammer'] }).fake);
    expect(readOwnLists('alice')).to.equal(true);
    expect(browser.document?.cookie).to.equal(`${NO_OWN_LISTS_COOKIE}=; path=/; max-age=0`);
  });

  it('expires after the TTL so the account is checked again', async () => {
    await refreshOwnLists('alice', api().fake);
    clock += OWN_LISTS_TTL_MS - 1;
    expect(readOwnLists('alice')).to.equal(false);
    clock += 2;
    expect(readOwnLists('alice')).to.equal(null);
  });

  it('switches to the username once the account mutes someone', async () => {
    await refreshOwnLists('alice', api().fake);
    expect(getEffectiveObserver('alice', readOwnLists('alice'))).to.equal(DEFAULT_OBSERVER);

    updateOwnListsAfterChange('alice', true);
    expect(readOwnLists('alice')).to.equal(true);
    expect(getEffectiveObserver('alice', readOwnLists('alice'))).to.equal('alice');
    expect(browser.document?.cookie).to.equal(`${NO_OWN_LISTS_COOKIE}=; path=/; max-age=0`);
  });

  it('forgets the answer after a removal, so it is checked again', async () => {
    await refreshOwnLists('alice', api({ muted: ['spammer'] }).fake);
    let notified = 0;
    const unsubscribe = subscribeOwnLists(() => notified++);
    updateOwnListsAfterChange('alice', false);
    unsubscribe();

    expect(readOwnLists('alice')).to.equal(null);
    expect(getEffectiveObserver('alice', readOwnLists('alice'))).to.equal('alice');
    expect(notified).to.equal(1);
  });
});

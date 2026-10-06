import { describe, it } from 'mocha';
import { expect } from 'chai';
import { readFeedCacheConfig } from './feed-cache';
import { createProfileCache, profileCacheKey } from './profile-cache';
import type { IProfileRequest } from './profile-cache';

const ANONYMOUS = 'hive.blog';
const MAINNET = 'beeab0de|https://api.hive.blog';
const MIRRORNET = '42|https://api.fake.openhive.network';

const request = (overrides: Partial<IProfileRequest> = {}): IProfileRequest => ({
  network: MAINNET,
  read: 'account',
  account: 'gtg',
  observer: ANONYMOUS,
  ...overrides
});

const setup = (config = readFeedCacheConfig({})) => {
  let clock = 0;
  const loads: string[] = [];
  const cache = createProfileCache<string>({ config, anonymousObserver: ANONYMOUS, now: () => clock });
  const get = (req: IProfileRequest = request()) =>
    cache.get(req, async () => {
      loads.push(profileCacheKey(req));
      return `profile#${loads.length}`;
    });
  return { get, loads, advance: (ms: number) => (clock += ms) };
};

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('profileCacheKey', () => {
  it('separates the network, the read and the account, but not the observer', () => {
    const keys = [
      request(),
      request({ network: MIRRORNET }),
      request({ read: 'reputation' }),
      request({ read: 'posts:blog' }),
      request({ read: 'posts:comments' }),
      request({ account: 'blocktrades' })
    ].map(profileCacheKey);
    expect(new Set(keys).size).to.equal(keys.length);
    expect(profileCacheKey(request({ observer: 'alice' }))).to.equal(profileCacheKey(request()));
  });

  it('cannot be confused by separators inside a field', () => {
    expect(profileCacheKey(request({ read: 'posts', account: 'a' }))).to.not.equal(
      profileCacheKey(request({ read: 'posts","a', account: '' }))
    );
  });
});

describe('createProfileCache', () => {
  it('answers anonymous reads from the cache within the TTL and never caches a viewer', async () => {
    const { get, loads, advance } = setup();
    expect(await get()).to.equal('profile#1');
    advance(29_999);
    expect(await get()).to.equal('profile#1');
    expect(await get(request({ observer: 'alice' }))).to.equal('profile#2');
    expect(await get(request({ observer: 'alice' }))).to.equal('profile#3');
    expect(loads).to.have.length(3);
  });

  it('serves a value at most one TTL past its freshness, reloading it meanwhile', async () => {
    const { get, advance } = setup();
    await get();
    advance(30_000);
    expect(await get()).to.equal('profile#1');
    await flush();
    expect(await get()).to.equal('profile#2');
    advance(60_000);
    expect(await get()).to.equal('profile#3');
  });

  it('caps a stale window longer than the TTL at the TTL', async () => {
    const { get, loads, advance } = setup(
      readFeedCacheConfig({ DENSER_FEED_CACHE_TTL_S: '10', DENSER_FEED_CACHE_STALE_S: '300' })
    );
    await get();
    advance(19_999);
    expect(await get()).to.equal('profile#1');
    await flush();
    expect(loads).to.have.length(2);
    advance(20_000);
    // Past fresh + one TTL: loaded in the foreground instead of served stale.
    expect(await get()).to.equal('profile#3');
  });

  it('loads every time when the TTL is 0', async () => {
    const { get, loads } = setup(readFeedCacheConfig({ DENSER_FEED_CACHE_TTL_S: '0' }));
    await get();
    await get();
    expect(loads).to.have.length(2);
  });
});

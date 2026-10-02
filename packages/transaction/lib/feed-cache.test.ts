import { describe, it } from 'mocha';
import { expect } from 'chai';
import { createFeedCache, feedCacheKey, readFeedCacheConfig } from './feed-cache';
import type { IFeedRequest } from './feed-cache';

const ANONYMOUS = 'hive.blog';
const MAINNET = 'beeab0de|https://api.hive.blog';
const MIRRORNET = '42|https://api.fake.openhive.network';

const request = (overrides: Partial<IFeedRequest> = {}): IFeedRequest => ({
  network: MAINNET,
  sort: 'trending',
  tag: '',
  startAuthor: '',
  startPermlink: '',
  limit: 20,
  observer: ANONYMOUS,
  ...overrides
});

const setup = (config = readFeedCacheConfig({})) => {
  let clock = 0;
  const loads: string[] = [];
  const revalidateErrors: unknown[] = [];
  let failNext = false;
  const cache = createFeedCache<string>({
    config,
    anonymousObserver: ANONYMOUS,
    now: () => clock,
    onRevalidateError: (error) => revalidateErrors.push(error)
  });
  const get = (req: IFeedRequest = request()) =>
    cache.get(req, async () => {
      loads.push(feedCacheKey(req));
      if (failNext) throw new Error('fetch failed');
      return `posts#${loads.length}`;
    });
  return {
    get,
    loads,
    revalidateErrors,
    advance: (ms: number) => (clock += ms),
    fail: (value: boolean) => (failNext = value)
  };
};

// Lets a background reload settle.
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('readFeedCacheConfig', () => {
  it('defaults to 30 s fresh, 30 s stale and a 32 MB cap', () => {
    expect(readFeedCacheConfig({})).to.deep.equal({
      ttlMs: 30_000,
      staleMs: 30_000,
      maxBytes: 32 * 1024 * 1024
    });
  });

  it('reads the env and falls back to the default for invalid values', () => {
    const config = readFeedCacheConfig({
      DENSER_FEED_CACHE_TTL_S: '0',
      DENSER_FEED_CACHE_STALE_S: '-5',
      DENSER_FEED_CACHE_MAX_MB: 'lots'
    });
    expect(config).to.deep.equal({ ttlMs: 0, staleMs: 30_000, maxBytes: 32 * 1024 * 1024 });
    expect(readFeedCacheConfig({ DENSER_FEED_CACHE_TTL_S: '2.5' }).ttlMs).to.equal(2_500);
  });
});

describe('feedCacheKey', () => {
  it('separates every request field except the observer', () => {
    const keys = [
      request(),
      request({ network: MIRRORNET }),
      request({ sort: 'hot' }),
      request({ tag: 'hive-123' }),
      request({ startAuthor: 'alice', startPermlink: 'post' }),
      request({ startAuthor: 'alice', startPermlink: 'other' }),
      request({ limit: 10 })
    ].map(feedCacheKey);
    expect(new Set(keys).size).to.equal(keys.length);
    expect(feedCacheKey(request({ observer: 'alice' }))).to.equal(feedCacheKey(request()));
  });

  it('cannot be confused by separators inside a field', () => {
    expect(feedCacheKey(request({ tag: 'a', startAuthor: 'b' }))).to.not.equal(
      feedCacheKey(request({ tag: 'a","b', startAuthor: '' }))
    );
  });
});

describe('createFeedCache', () => {
  it('answers a repeated anonymous request within the TTL from the cache', async () => {
    const { get, loads, advance } = setup();
    expect(await get()).to.equal('posts#1');
    advance(29_999);
    expect(await get()).to.equal('posts#1');
    expect(loads).to.have.length(1);
  });

  it('never caches a request with an observer', async () => {
    const { get, loads } = setup();
    expect(await get(request({ observer: 'alice' }))).to.equal('posts#1');
    expect(await get(request({ observer: 'alice' }))).to.equal('posts#2');
    // ...and a viewer's data never answers an anonymous request.
    expect(await get()).to.equal('posts#3');
    expect(loads).to.have.length(3);
  });

  it('keeps networks apart', async () => {
    const { get } = setup();
    await get(request({ network: MAINNET }));
    expect(await get(request({ network: MIRRORNET }))).to.equal('posts#2');
  });

  it('serves a stale value after the TTL while reloading it in the background', async () => {
    const { get, loads, advance } = setup();
    await get();
    advance(30_000);
    expect(await get()).to.equal('posts#1');
    await flush();
    expect(loads).to.have.length(2);
    expect(await get()).to.equal('posts#2');
  });

  it('loads in the foreground once the stale window has passed', async () => {
    const { get, advance } = setup();
    await get();
    advance(60_000);
    expect(await get()).to.equal('posts#2');
  });

  it('keeps serving the stale value when the background reload fails, and reports it', async () => {
    const { get, advance, fail, revalidateErrors } = setup();
    await get();
    fail(true);
    advance(30_000);
    expect(await get()).to.equal('posts#1');
    await flush();
    expect(revalidateErrors).to.have.length(1);
    advance(29_999);
    expect(await get()).to.equal('posts#1');
  });

  it('never caches a failed load', async () => {
    const { get, fail } = setup();
    fail(true);
    await get().then(
      () => expect.fail('the load failed'),
      (error: Error) => expect(error.message).to.equal('fetch failed')
    );
    fail(false);
    expect(await get()).to.equal('posts#2');
  });

  it('fails a cold request once the stale window has passed', async () => {
    const { get, advance, fail } = setup();
    await get();
    advance(60_000);
    fail(true);
    await get().then(
      () => expect.fail('nothing servable was cached'),
      (error: Error) => expect(error.message).to.equal('fetch failed')
    );
  });

  it('shares one load between concurrent requests', async () => {
    const { get, loads } = setup();
    const results = await Promise.all([get(), get(), get()]);
    expect(results).to.deep.equal(['posts#1', 'posts#1', 'posts#1']);
    expect(loads).to.have.length(1);
  });

  it('calls through when the TTL is 0', async () => {
    const { get, loads } = setup(readFeedCacheConfig({ DENSER_FEED_CACHE_TTL_S: '0' }));
    await get();
    await get();
    expect(loads).to.have.length(2);
  });

  it('evicts the least recently used entries past the memory cap', async () => {
    // Each value ('"posts#N"') serializes to 9 code units; the cap holds two.
    const { get, loads } = setup({ ttlMs: 30_000, staleMs: 30_000, maxBytes: 18 });
    await get(request({ sort: 'trending' }));
    await get(request({ sort: 'hot' }));
    await get(request({ sort: 'trending' }));
    await get(request({ sort: 'created' }));
    expect(loads).to.have.length(3);
    expect(await get(request({ sort: 'trending' }))).to.equal('posts#1');
    expect(await get(request({ sort: 'hot' }))).to.equal('posts#4');
  });
});

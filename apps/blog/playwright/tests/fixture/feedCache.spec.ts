import type { APIRequestContext } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { FEED_CACHE_STALE_S, FEED_CACHE_TTL_S } from '../support/feed-cache-server';
import type { IJsonRpcCall } from '../support/mock-server';

/**
 * Server-side feed cache: anonymous feed renders reuse the first page of posts for
 * DENSER_FEED_CACHE_TTL_S, then serve it stale for DENSER_FEED_CACHE_STALE_S while reloading it.
 * Requests with an observer always fetch.
 *
 * Runs against the suite's second blog server (support/feed-cache-server.ts), the only one with the
 * cache on, whose TTL is a few seconds: each test first waits until nothing is cached any more.
 * Pure HTTP, so that only the server's calls reach the proxy's counter, not the browser's.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- feedCache
 */

test.use({ fixtureTestName: 'login' });
test.describe.configure({ mode: 'serial' });

const TTL_MS = FEED_CACHE_TTL_S * 1000;
const MAX_AGE_MS = (FEED_CACHE_TTL_S + FEED_CACHE_STALE_S) * 1000;
const MARGIN_MS = 500;
const POST_CARD = 'data-testid="post-list-item"';

const isRankedPosts = ({ method }: IJsonRpcCall) => method === 'bridge.get_ranked_posts';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const waitUntilNothingIsCached = () => wait(MAX_AGE_MS + MARGIN_MS);

const loadTrending = async (request: APIRequestContext, baseURL: string) => {
  const response = await request.get(`${baseURL}/trending`);
  return { status: response.status(), headers: response.headers(), html: await response.text() };
};

let baseURL = '';
test.beforeEach(({ feedCacheBaseURL }) => {
  test.skip(!feedCacheBaseURL, 'no blog serves with the feed cache on');
  baseURL = feedCacheBaseURL ?? '';
});

test('FEED-CACHE-01 — two anonymous loads within the TTL make one get_ranked_posts call', async ({
  context,
  fixtureProxy
}) => {
  await waitUntilNothingIsCached();
  const calls = fixtureProxy.countRequests(isRankedPosts);
  try {
    const first = await loadTrending(context.request, baseURL);
    const second = await loadTrending(context.request, baseURL);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.html, 'the cached feed is server-rendered').toContain(POST_CARD);
    expect(calls.count()).toBe(1);
    // Only the data is cached, never the page.
    expect(second.headers['cache-control']).toContain('no-store');
  } finally {
    calls.stop();
  }
});

test.describe('logged in', () => {
  test.use({ authenticatedUser: {} });

  test('FEED-CACHE-02 — a load with an observer always calls through', async ({ context, fixtureProxy }) => {
    const calls = fixtureProxy.countRequests(isRankedPosts);
    try {
      expect((await loadTrending(context.request, baseURL)).status).toBe(200);
      expect((await loadTrending(context.request, baseURL)).status).toBe(200);
      expect(calls.count()).toBe(2);
    } finally {
      calls.stop();
    }
  });
});

test('FEED-CACHE-03 — after the TTL the feed is fetched again', async ({ context, fixtureProxy }) => {
  await waitUntilNothingIsCached();
  expect((await loadTrending(context.request, baseURL)).status).toBe(200);
  const calls = fixtureProxy.countRequests(isRankedPosts);
  try {
    await wait(TTL_MS + MARGIN_MS);
    const stale = await loadTrending(context.request, baseURL);

    expect(stale.status).toBe(200);
    expect(stale.html).toContain(POST_CARD);
    // The stale feed answers at once; the reload runs in the background.
    await expect.poll(() => calls.count()).toBe(1);
  } finally {
    calls.stop();
  }
});

test('FEED-CACHE-04 — with nothing cached an unreachable feed still answers 503', async ({
  context,
  fixtureProxy
}) => {
  await waitUntilNothingIsCached();
  const restore = fixtureProxy.failRequests(isRankedPosts);
  try {
    const response = await loadTrending(context.request, baseURL);
    expect(response.status).toBe(503);
    expect(response.headers['retry-after']).toBe('30');
  } finally {
    restore();
  }
});

test('FEED-CACHE-05 — a cached feed keeps answering 200 while the API is unreachable', async ({
  context,
  fixtureProxy
}) => {
  await waitUntilNothingIsCached();
  expect((await loadTrending(context.request, baseURL)).status).toBe(200);
  const restore = fixtureProxy.failRequests(isRankedPosts);
  const calls = fixtureProxy.countRequests(isRankedPosts);
  try {
    await wait(TTL_MS + MARGIN_MS);
    const stale = await loadTrending(context.request, baseURL);

    expect(stale.status).toBe(200);
    expect(stale.html).toContain(POST_CARD);
    // The background reload was attempted, and failed.
    await expect.poll(() => calls.count()).toBeGreaterThan(0);
    // Let its retries run out while the API is still down, so no later test finds it cached.
    await wait(MARGIN_MS);
  } finally {
    calls.stop();
    restore();
  }
});

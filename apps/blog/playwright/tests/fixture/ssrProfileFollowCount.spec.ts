import { test, expect } from '../support/fixture-proxy-test';
import { FEED_CACHE_STALE_S, FEED_CACHE_TTL_S } from '../support/feed-cache-server';

/**
 * A profile whose follow counts could not be read shows them as unavailable, never as 0.
 *
 * The profile header's follower / following counts come from `bridge.get_profile`, read next to
 * the account itself. When that secondary read fails (an upstream 429 or a node blip) the page
 * still renders from the account, but the counts are marked unavailable instead of falling back
 * to a real-looking 0. `failRequests` drops every `bridge.get_profile` call, so the server's
 * retries fail too. SAFE-15 checks such a degraded profile is not cached for later anonymous viewers.
 *
 * Level: pure HTTP (the header is server-rendered into the initial HTML). Replay only.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- ssrProfileFollowCount
 */

test.use({ fixtureTestName: 'userProfileTabs' });

const PROFILE_PATH = '/@hiveio';
// bridge.get_profile's recorded `stats.followers` for hiveio in the userProfileTabs fixtures.
const RECORDED_FOLLOWERS = 2263;
const UNAVAILABLE_MARKER = 'data-testid="profile-follow-count-unavailable"';

test('SAFE-11 — a failed follow-count read renders the counts as unavailable, not 0', async ({
  request,
  fixtureProxy
}) => {
  const restore = fixtureProxy.failRequests(({ method }) => method === 'bridge.get_profile');
  let html: string;
  try {
    const res = await request.get(PROFILE_PATH);
    expect(res.status(), 'the profile itself still renders').toBe(200);
    html = await res.text();
  } finally {
    restore();
  }

  expect(html).toContain('data-testid="profile-stats"');
  expect(html.split(UNAVAILABLE_MARKER).length - 1, 'followers and following are both unavailable').toBe(2);
  expect(html).not.toContain(`>${RECORDED_FOLLOWERS}<`);
});

test('SAFE-12 — the recorded follow counts render when the read succeeds', async ({ request }) => {
  const res = await request.get(PROFILE_PATH);
  expect(res.status()).toBe(200);

  const html = await res.text();
  expect(html).toContain(`>${RECORDED_FOLLOWERS}<`);
  expect(html).not.toContain(UNAVAILABLE_MARKER);
});

test('SAFE-15 — a profile read with failed follow counts is not served from the cache afterwards', async ({
  request,
  fixtureProxy,
  feedCacheBaseURL
}) => {
  test.skip(!feedCacheBaseURL, 'no blog serves with the server-side cache on');
  // Let any profile a previous attempt cached expire first.
  await new Promise((resolve) => setTimeout(resolve, (FEED_CACHE_TTL_S + FEED_CACHE_STALE_S) * 1000 + 500));
  const url = `${feedCacheBaseURL}${PROFILE_PATH}`;

  const restore = fixtureProxy.failRequests(({ method }) => method === 'bridge.get_profile');
  let degraded: string;
  try {
    degraded = await (await request.get(url)).text();
  } finally {
    restore();
  }
  expect(degraded, 'the first, anonymous read is degraded').toContain(UNAVAILABLE_MARKER);

  const res = await request.get(url);
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html, 'the next anonymous read loads the counts again').toContain(`>${RECORDED_FOLLOWERS}<`);
  expect(html).not.toContain(UNAVAILABLE_MARKER);
});

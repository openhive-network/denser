import { test, expect } from '../support/fixture-proxy-test';

/**
 * SSR graceful degradation on partial server-fetch failure (Obszar 7).
 *
 * The post route fetches the post and its discussion (comments) server-side in
 * a single `Promise.allSettled`. The post is the primary resource; the
 * discussion is secondary. When the SECONDARY fetch fails at the transport
 * level, the route must degrade gracefully — render the article anyway
 * (discussionData = null) rather than 500 or blank the whole page.
 * See app/[param]/[p2]/[permlink]/page.tsx.
 *
 * This uses the `ssrChecks_discussionError` overlay, which patches the recorded
 * bridge.get_discussion for `test-ako-post` to an HTTP 503. The post fetch is
 * served normally from the base fixtures, so the article must still appear.
 *
 * Level: pure HTTP (the article is server-rendered into the initial HTML — see
 * ssrChecks SSR-16). Replay only.
 *
 * NOTE (separate, harder case): a TRANSPORT failure on the PRIMARY post fetch
 * must surface a 5xx ServiceUnavailable, never a 404 (hive/denser#926). That
 * path can't be faithfully reproduced through the fixture proxy — the bundled
 * wax does not classify a proxy-injected 5xx as a `WaxRequestError` — so
 * asserting it at the HTTP level here is unreliable. Cover it with a unit
 * test on `isTransportError` and/or an e2e against a degraded node. (Since
 * the post route stopped streaming (#930), an API-unreachable primary fetch
 * has been verified to return a real 500 at the document level.)
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- ssrErrorFallback
 */

const POST_PATH = '/test/@guest4test1/test-ako-post';

test.use({ fixtureTestName: 'ssrChecks_discussionError' });

test('SAFE-07 — a failed secondary (discussion) fetch still server-renders the article', async ({
  request
}) => {
  const res = await request.get(POST_PATH);

  // The page must not 500 or blank out because comments failed to load.
  expect(res.status()).toBe(200);

  const html = await res.text();
  // The article itself (from the primary post fetch) is server-rendered…
  expect(html, 'article should still render despite the discussion fetch failing').toContain(
    'data-testid="article-title"'
  );
  // …and the route did NOT fall back to the whole-page error boundary.
  expect(html, 'partial failure must not trip the service-unavailable boundary').not.toContain(
    'Service Temporarily Unavailable'
  );
});

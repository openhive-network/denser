import { test, expect } from '../support/fixture-proxy-test';
import { TagCommunityFeedsPage } from '../support/pages/tagCommunityFeedsPage';

/**
 * Client-side retry resilience for hive/denser#761.
 *
 * `community-layout.tsx`'s `getSubscribers` query (`bridge.list_subscribers`) has no
 * SSR `initialData` — it is a pure client-side fetch that always fires fresh from the
 * browser (this is the confirmed client-only gap noted in `ssrChecks.spec.ts` / the
 * fixture CLAUDE.md: "the community info sidebar (gated on a client-only
 * getSubscribers)"). That makes it the one call in this suite `page.route` can
 * faithfully turn into a transient 503 and prove wax's retry actually recovers —
 * unlike an SSR-side transport error, which `page.route` cannot see at all
 * (`fixture/CLAUDE.md`: "`page.route` doesn't intercept SSR requests") and which the
 * fixture-proxy's own error path doesn't classify reliably either (see
 * `ssrErrorFallback.spec.ts`'s note on proxy-injected 5xx classification).
 *
 * `route.fulfill({status:503})` returns a clean, direct 503 — no fixture-proxy
 * involved — which a standalone check confirmed `@hiveio/wax` classifies as
 * `WaxUnknownRequestError` (a `WaxRequestError` subclass), i.e. `isTransportError`
 * returns true and `chain-retry.ts` retries it. That is what this test exercises.
 *
 * Scope: only the RETRY leg (same endpoint, 2 transient failures then success) is
 * covered here. Endpoint FAILOVER is not reachable in this harness —
 * `REACT_APP_API_ENDPOINT` is pinned to the single fixture-proxy port for the whole
 * suite (`playwright.fixture.config.ts`), so there is no second configured host to
 * fail over to. Failover (including multi-hop ordered fallback lists) is covered by
 * the unit tests in `packages/transaction/lib/chain-retry.test.ts`.
 *
 * Reuses the `tagCommunityFeeds` fixture dir (already has a recorded
 * `bridge.list_subscribers` for this community) — no new fixtures to record.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- clientRetryResilience
 */

test.use({ fixtureTestName: 'tagCommunityFeeds' });

const FIXTURE_PROXY_PORT = 8200;
const COMMUNITY_TAG = 'hive-139531';
// chain-retry.ts allows MAX_ATTEMPTS=3 total tries on the primary endpoint before
// giving up (or failing over) — fail one fewer than that so the final attempt
// (the recorded fixture response) succeeds and proves the retry recovered.
const TRANSIENT_FAILURES = 2;

test('client-side wax call recovers from transient 503s via retry', async ({ page }) => {
  let listSubscribersAttempts = 0;

  await page.route(
    (url) => url.hostname === 'localhost' && url.port === String(FIXTURE_PROXY_PORT),
    async (route) => {
      const request = route.request();
      if (request.method() !== 'POST') {
        return route.continue();
      }

      let body: { method?: unknown } | null = null;
      try {
        body = request.postDataJSON();
      } catch {
        return route.continue();
      }

      if (body?.method !== 'bridge.list_subscribers') {
        return route.continue();
      }

      listSubscribersAttempts++;
      if (listSubscribersAttempts <= TRANSIENT_FAILURES) {
        return route.fulfill({ status: 503, contentType: 'application/json', body: '{}' });
      }

      // Recovery attempt — let the real fixture proxy serve its recorded response.
      return route.continue();
    }
  );

  const tagCommunityFeedsPage = new TagCommunityFeedsPage(page);
  await tagCommunityFeedsPage.gotoTagFeed('trending', COMMUNITY_TAG);

  // community-description.tsx only renders once BOTH getCommunity and getSubscribers
  // have resolved (community-layout.tsx: `communityData && subsData`) — this becoming
  // visible proves the client-side wax call survived the injected 503s.
  await tagCommunityFeedsPage.validateCommunitySidebarVisible();

  expect(
    listSubscribersAttempts,
    'wax should retry bridge.list_subscribers on the primary endpoint before succeeding'
  ).toBe(TRANSIENT_FAILURES + 1);
});

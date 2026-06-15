import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import type { Locator } from '@playwright/test';

/**
 * SSR correctness checks — does the SERVER render real content into the
 * initial HTML, before any client JavaScript runs?
 *
 * Technique: every test runs with `javaScriptEnabled: false`. With no client
 * JS, the only thing in the DOM is what the Next.js server rendered into the
 * initial HTML response. So:
 *   - element VISIBLE → it was server-side rendered (SSR ✅)
 *   - element MISSING → it is client-only (SSR gap — crawlers, no-JS users
 *                       and first paint never see it)
 *
 * Personalization is driven by the lightweight `observer` value, which on the
 * server resolves from the iron-session cookie (lib/auth-utils.ts). The
 * fixture-proxy harness seeds that cookie when `authenticatedUser` is set.
 * Observer is `guest4test1` — a team-controlled test account with rich, stable
 * subscriptions (incl. a `member` role on hive-160391), so the personalized
 * branches actually have data to render.
 *
 * ── Record vs replay ────────────────────────────────────────────────────────
 * Recording captures the upstream Hive responses once; replay serves them
 * deterministically (no network, no flakiness) while the server still renders
 * SSR live — so SSR gaps still surface on replay.
 *
 * IMPORTANT: assertions are SKIPPED while recording. Playwright restarts the
 * worker after a failing test, and the record proxy rewrites the fixture dir on
 * every worker teardown — so a single failing assertion mid-record would wipe
 * the fixtures captured by earlier tests. Recording therefore only navigates
 * (capturing every SSR call); the assertions run on replay, where nothing is
 * written and a failure costs nothing.
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture -- ssrChecks
 * Replay:  pnpm --filter @hive/blog test:fixture -- ssrChecks
 */

/** Test account with non-empty, stable subscriptions (see header). */
const SUBSCRIBED_USER = 'guest4test1';
/** A community `SUBSCRIBED_USER` belongs to with a `member` role. */
const SUBSCRIBED_COMMUNITY = 'hive-160391'; // Blockchain Wizardry

/** Assert SSR presence — but only on replay (see header note on recording). */
async function expectSsrVisible(locator: Locator): Promise<void> {
  if (isRecordMode) return;
  await expect(locator).toBeVisible();
}

test.use({ fixtureTestName: 'ssrChecks' });

// ── Anonymous SSR ───────────────────────────────────────────────────────────
test.describe('SSR — anonymous feed & sidebar (JS disabled)', () => {
  test.use({ javaScriptEnabled: false });

  test('SSR-01 — anonymous /trending renders the post list in server HTML', async ({ page }) => {
    await page.goto('/trending');
    await expectSsrVisible(page.getByTestId('post-list-item').first());
  });

  test('SSR-06 — anonymous sidebar renders trending communities in server HTML', async ({
    page
  }) => {
    await page.goto('/trending');
    await expectSsrVisible(page.getByTestId('card-trending-comunities'));
  });

  // The skip-prefetch branch: for an anonymous observer, `/{sort}/my` must NOT
  // SSR a feed (hive.blog's subscriptions would be meaningless). With JS off
  // there is no client fetch either, so the server HTML carries zero posts.
  test('SSR-03 — anonymous /trending/my renders NO posts (skip-prefetch branch)', async ({
    page
  }) => {
    await page.goto('/trending/my');
    if (isRecordMode) return;
    await expect(page.getByTestId('post-list-item')).toHaveCount(0);
  });
});

// ── Logged-in personalized SSR ──────────────────────────────────────────────
test.describe('SSR — logged-in personalization (JS disabled)', () => {
  test.use({ javaScriptEnabled: false, authenticatedUser: { username: SUBSCRIBED_USER } });

  // Differential partner of SSR-03: the same `/trending/my` route, but for a
  // logged-in observer with subscriptions, MUST SSR the personalized feed.
  test('SSR-02 — logged-in /trending/my renders subscribed-feed posts in server HTML', async ({
    page
  }) => {
    await page.goto('/trending/my');
    await expectSsrVisible(page.getByTestId('post-list-item').first());
  });

  test('SSR-05 — logged-in sidebar renders communities in server HTML', async ({ page }) => {
    await page.goto('/trending');
    await expectSsrVisible(page.getByTestId('card-trending-comunities'));
  });
});

// ── Confirmed SSR gaps: React Query Hydrate/dehydrate pages ──────────────────
// These routes deliver data via <Hydrate>/dehydrate rather than the context
// pattern the feed pages use. The codebase already moved feeds AWAY from
// Hydrate because "dehydrated state doesn't reliably reach the browser" — and
// replay confirms it: each page fetches its data server-side (the fixtures
// prove the API call happened) yet renders NOTHING into the initial HTML; the
// content only appears after client hydration.
//
// Each is marked `test.fail()` on replay, so the suite stays green while
// documenting the gap. If someone makes one of these pages SSR its content,
// the test will start passing unexpectedly → flip it to a normal assertion and
// drop the marker. The marker is skipped while recording (assertions are gated
// off there, so the test would otherwise "pass" and trip the expected-failure).
test.describe('SSR — Hydrate-based pages (JS disabled, confirmed gaps)', () => {
  test.use({ javaScriptEnabled: false, authenticatedUser: { username: SUBSCRIBED_USER } });

  test('SSR-11 — /@user/communities renders the subscriptions list in server HTML', async ({
    page
  }) => {
    test.fail(
      !isRecordMode,
      'SSR gap: subscriptions are fetched server-side but rendered only after client hydration (React Query Hydrate)'
    );
    await page.goto(`/@${SUBSCRIBED_USER}/communities`);
    await expectSsrVisible(page.getByTestId('author-community-subscribed-list-item').first());
  });

  test('SSR-12 — /@user/notifications renders notifications in server HTML', async ({ page }) => {
    test.fail(
      !isRecordMode,
      'SSR gap: notifications are fetched server-side but rendered only after client hydration (React Query Hydrate)'
    );
    await page.goto(`/@${SUBSCRIBED_USER}/notifications`);
    await expectSsrVisible(page.getByTestId('notification-list-item').first());
  });

  test('SSR-13 — /roles/[community] renders the roles table in server HTML', async ({ page }) => {
    test.fail(
      !isRecordMode,
      'SSR gap: community roles are fetched server-side but rendered only after client hydration (React Query Hydrate)'
    );
    await page.goto(`/roles/${SUBSCRIBED_COMMUNITY}`);
    await expectSsrVisible(page.getByTestId('community-roles-table'));
  });
});

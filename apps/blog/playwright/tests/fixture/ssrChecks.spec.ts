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

/** A real, stable post by the test account (never deleted). */
const POST_CATEGORY = 'test';
const POST_PERMLINK = 'test-ako-post';
/** Community `SUBSCRIBED_USER` is a member of — for personalized community SSR. */
const COMMUNITY = SUBSCRIBED_COMMUNITY;

/** Assert SSR presence — but only on replay (see header note on recording). */
async function expectSsrVisible(locator: Locator): Promise<void> {
  if (isRecordMode) return;
  await expect(locator).toBeVisible();
}

/** Assert a server-rendered <head> meta tag carries non-empty content. */
async function expectSsrMetaContent(locator: Locator): Promise<void> {
  if (isRecordMode) return;
  await expect(locator).toHaveAttribute('content', /.+/);
}

/** Assert a server-rendered <head> link tag carries a non-empty href. */
async function expectSsrHref(locator: Locator): Promise<void> {
  if (isRecordMode) return;
  await expect(locator).toHaveAttribute('href', /.+/);
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

// ── Post detail, profile & SEO metadata (anonymous, JS disabled) ────────────
test.describe('SSR — post detail, profile & SEO (JS disabled)', () => {
  test.use({ javaScriptEnabled: false });

  test('SSR-16 — post detail renders the article title in server HTML', async ({ page }) => {
    await page.goto(`/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`);
    await expectSsrVisible(page.getByTestId('article-title'));
  });

  // SEO: crawlers and link-unfurlers do not run JS, so the OpenGraph title MUST
  // be in the server <head> (generated by the route's generateMetadata).
  test('SSR-19 — post detail emits a non-empty og:title in the server <head>', async ({ page }) => {
    await page.goto(`/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`);
    await expectSsrMetaContent(page.locator('head meta[property="og:title"]'));
  });

  // SEO crawlers read meta description from the server <head>; the post layout's
  // generateMetadata sets it from the post summary/description.
  test('SSR-23 — post detail emits a non-empty meta description in the server <head>', async ({
    page
  }) => {
    await page.goto(`/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`);
    await expectSsrMetaContent(page.locator('head meta[name="description"]'));
  });

  // Gap: no route sets `alternates.canonical`, so Next emits no
  // <link rel="canonical">. Hive posts are reachable under many tag/community
  // prefixes (/trending/@u/p, /hive-x/@u/p, …), so a missing canonical lets
  // crawlers treat each as a separate page (duplicate-content dilution).
  test('SSR-24 — post detail emits a canonical link in the server <head>', async ({ page }) => {
    test.fail(!isRecordMode, 'SEO gap (#903): no canonical link is set (no alternates.canonical in metadata)');
    await page.goto(`/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`);
    await expectSsrHref(page.locator('head link[rel="canonical"]'));
  });

  // Gap: no route sets a `robots` directive and there is no robots.ts / robots.txt
  // route either, so the server emits no <meta name="robots">. Indexing is left
  // entirely to crawler defaults with no per-page control.
  test('SSR-25 — post detail emits a robots meta tag in the server <head>', async ({ page }) => {
    test.fail(!isRecordMode, 'SEO gap (#903): no robots meta is set (no robots field, no robots.txt route)');
    await page.goto(`/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`);
    await expectSsrMetaContent(page.locator('head meta[name="robots"]'));
  });

  // User-profile SEO: generateMetadata (user-profile layout) sets og title +
  // image from the account — these MUST be in the server <head> for crawlers,
  // even though the profile BODY is client-only (see SSR-10).
  test('SSR-21 — /@user emits og:title + og:image in the server <head>', async ({ page }) => {
    await page.goto(`/@${SUBSCRIBED_USER}`);
    await expectSsrMetaContent(page.locator('head meta[property="og:title"]'));
    await expectSsrMetaContent(page.locator('head meta[property="og:image"]'));
  });

  // Gap: the whole user-profile body renders client-only. With JS off the
  // server HTML carries just the navbar shell — no post list — even though
  // get_account_posts runs and returns 20 posts server-side.
  test('SSR-10 — /@user (blog tab) renders the account post list in server HTML', async ({
    page
  }) => {
    test.fail(!isRecordMode, 'SSR gap: user-profile body is client-only (server HTML is navbar-only)');
    await page.goto(`/@${SUBSCRIBED_USER}`);
    await expectSsrVisible(page.getByTestId('post-list-item').first());
  });

  // Gap: classic search fetches results server-side (search-api.find_text runs
  // when both q and s are present) but the results component renders them
  // client-only, so the server HTML carries no result list.
  test('SSR-20 — /search renders classic results in server HTML', async ({ page }) => {
    test.fail(!isRecordMode, 'SSR gap: classic search results render client-only despite server-side fetch');
    await page.goto('/search?q=hive&s=relevance');
    await expectSsrVisible(page.getByTestId('post-list-item').first());
  });
});

// ── Community profile (logged-in, JS disabled) ──────────────────────────────
test.describe('SSR — community profile (JS disabled)', () => {
  test.use({ javaScriptEnabled: false, authenticatedUser: { username: SUBSCRIBED_USER } });

  test('SSR-08 — community feed renders the post list in server HTML', async ({ page }) => {
    await page.goto(`/trending/${COMMUNITY}`);
    await expectSsrVisible(page.getByTestId('post-list-item').first());
  });

  // Community SEO: buildCommunityTagMetadata sets og title + image from the
  // community — these MUST be in the server <head> for crawlers, even though
  // the info sidebar is client-only (see SSR-09).
  test('SSR-22 — community page emits og:title + og:image in the server <head>', async ({
    page
  }) => {
    await page.goto(`/trending/${COMMUNITY}`);
    await expectSsrMetaContent(page.locator('head meta[property="og:title"]'));
    await expectSsrMetaContent(page.locator('head meta[property="og:image"]'));
  });

  // Gap: the community sidebar (CommunityDescription) only renders once BOTH
  // community data AND subscriber data are present — but getSubscribers is
  // fetched client-side with no SSR/initialData, so the sidebar never appears
  // in the server HTML (the community feed posts beside it do — SSR-08).
  test('SSR-09 — community info sidebar renders in server HTML', async ({ page }) => {
    test.fail(!isRecordMode, 'SSR gap: sidebar gated on client-only subscriber fetch');
    await page.goto(`/trending/${COMMUNITY}`);
    await expectSsrVisible(page.getByTestId('community-info-sidebar'));
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

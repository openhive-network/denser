import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import type { Locator, Page } from '@playwright/test';
import { testTimeout } from '../../../../../playwright/support/timeouts';

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

/**
 * Loading-placeholder text the app renders into skeleton/fallback elements:
 * the `global.loading` string ("Loading"), the literal `<div>Loading...</div>`
 * fallbacks in the post lists, and the user-profile skeleton's sr-only
 * "Loading…". Matched as the element's WHOLE text (not a substring), so a
 * skeleton whose entire content is the placeholder is rejected, while a real
 * card/title that merely happens to contain the word "loading" is not.
 */
/**
 * A desktop Chrome user agent, outside Next's `htmlLimitedBots` list. The social-card
 * checks (SSR-19/21/22) send it so they prove og tags reach the server <head> for a
 * regular browser too — i.e. that metadata is never streamed into <body> for anyone.
 */
const REGULAR_BROWSER_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const SSR_LOADING_PLACEHOLDER = /^(loading\.{0,3}|please wait|busy, please wait)$/i;

/**
 * `expect` for the server-HTML assertions. With JavaScript disabled nothing can
 * change the DOM once `page.goto` has resolved, so polling for the default
 * expect timeout (10 s) only delays a result that is already final, and every
 * expected-failure gap marker (`test.fail`) would spend the full 10 s before
 * reporting. Playwright runs the first check of an assertion without a deadline,
 * so this short timeout never cuts that check short; it only bounds the
 * pointless re-polling.
 */
const ssrExpect = expect.configure({ timeout: testTimeout('ssr:static-dom', 1_000) });

/**
 * Assert SSR presence AND non-empty, non-placeholder content — the single
 * body-content helper (assertions run only on replay; see header note on
 * recording).
 *
 * `toBeVisible()` alone only proves the element occupies a layout box — a
 * server-rendered empty shell (e.g. a card with padding/min-height but no data)
 * can be "visible" yet carry no text. We additionally require:
 *   1. at least one non-whitespace character (not an empty skeleton), and
 *   2. the whole text is not a loading placeholder ("Loading…" etc.) — guards
 *      against a future skeleton/Suspense fallback rendering under our testid.
 *
 * This matters for the `test.fail` gap cases too: a gap should flip to an
 * unexpected pass only when the content genuinely SSRs with real data, not when
 * an empty or still-loading shell appears — otherwise it would falsely read as
 * "gap closed". Always point this at a data-bearing element (a list/table row,
 * or a container whose first child is dynamic data), never at a container whose
 * leading text is a static header — see the SSR-13 / sidebar notes below.
 */
async function expectSsrNonEmpty(locator: Locator): Promise<void> {
  if (isRecordMode) return;
  await ssrExpect(locator).toBeVisible();
  await ssrExpect(locator).toContainText(/\S/);
  await ssrExpect(locator).not.toHaveText(SSR_LOADING_PLACEHOLDER);
}

/** Assert a server-rendered <head> meta tag carries non-empty content. */
async function expectSsrMetaContent(locator: Locator): Promise<void> {
  if (isRecordMode) return;
  await ssrExpect(locator).toHaveAttribute('content', /.+/);
}

/** Assert a server-rendered <head> link tag carries a non-empty href. */
async function expectSsrHref(locator: Locator): Promise<void> {
  if (isRecordMode) return;
  await ssrExpect(locator).toHaveAttribute('href', /.+/);
}

/** The JSON-LD nodes of the server HTML; each block must parse as JSON. */
async function jsonLdNodes(page: Page): Promise<Array<Record<string, unknown>>> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.map((block) => JSON.parse(block));
}

test.use({ fixtureTestName: 'ssrChecks' });

// ── Anonymous SSR ───────────────────────────────────────────────────────────
test.describe('SSR — anonymous feed & sidebar (JS disabled)', () => {
  test.use({ javaScriptEnabled: false });

  test('SSR-01 — anonymous /trending renders the post list in server HTML', async ({ page }) => {
    await page.goto('/trending');
    await expectSsrNonEmpty(page.getByTestId('post-list-item').first());
  });

  test('SSR-06 — anonymous sidebar renders trending communities in server HTML', async ({
    page
  }) => {
    await page.goto('/trending');
    // Target an actual community link, not the whole card: the card has a
    // static header ("All posts") + a static "Explore communities" link that
    // render even with zero communities. Community items are the only links
    // with an `/trending/<name>` href (the header link is exactly `/trending`).
    await expectSsrNonEmpty(
      page.getByTestId('card-trending-comunities').locator('a[href^="/trending/"]').first()
    );
  });

  // The skip-prefetch branch: for an anonymous observer, `/{sort}/my` must NOT
  // SSR a feed (hive.blog's subscriptions would be meaningless). With JS off
  // there is no client fetch either, so the server HTML carries zero posts.
  test('SSR-03 — anonymous /trending/my renders NO posts (skip-prefetch branch)', async ({
    page
  }) => {
    await page.goto('/trending/my');
    if (isRecordMode) return;
    await ssrExpect(page.getByTestId('post-list-item')).toHaveCount(0);
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
    await expectSsrNonEmpty(page.getByTestId('post-list-item').first());
  });

  test('SSR-05 — logged-in sidebar renders communities in server HTML', async ({ page }) => {
    await page.goto('/trending');
    // See SSR-06: assert a real community item, not the statically-headed card.
    await expectSsrNonEmpty(
      page.getByTestId('card-trending-comunities').locator('a[href^="/trending/"]').first()
    );
  });
});

// ── Post detail, profile & SEO metadata (anonymous, JS disabled) ────────────
test.describe('SSR — post detail, profile & SEO (JS disabled)', () => {
  test.use({ javaScriptEnabled: false, userAgent: REGULAR_BROWSER_USER_AGENT });

  test('SSR-16 — post detail renders the article title in server HTML', async ({ page }) => {
    await page.goto(`/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`);
    await expectSsrNonEmpty(page.getByTestId('article-title'));
  });

  // SEO: crawlers and link-unfurlers do not run JS, so the OpenGraph title and
  // image MUST be in the server <head> (generated by the route's generateMetadata).
  test('SSR-19 — post detail emits og:title + og:image in the server <head>', async ({ page }) => {
    await page.goto(`/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`);
    await expectSsrMetaContent(page.locator('head meta[property="og:title"]'));
    await expectSsrMetaContent(page.locator('head meta[property="og:image"]'));
  });

  // SEO crawlers read meta description from the server <head>; the post layout's
  // generateMetadata sets it from the post summary/description.
  test('SSR-23 — post detail emits a non-empty meta description in the server <head>', async ({
    page
  }) => {
    await page.goto(`/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`);
    await expectSsrMetaContent(page.locator('head meta[name="description"]'));
  });

  // Hive posts are reachable under many tag/community prefixes (/trending/@u/p,
  // /hive-x/@u/p, …); without a canonical crawlers treat each as a separate page
  // (duplicate-content dilution). The exact URL is asserted by ssrSeoGuard.
  test('SSR-24 — post detail emits a canonical link in the server <head>', async ({ page }) => {
    await page.goto(`/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`);
    await expectSsrHref(page.locator('head link[rel="canonical"]'));
  });

  // The root layout makes every public page indexable; user-specific pages opt out (SSR-29).
  test('SSR-25 — post detail emits a robots meta tag in the server <head>', async ({ page }) => {
    await page.goto(`/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`);
    await expectSsrMetaContent(page.locator('head meta[name="robots"]'));
    if (isRecordMode) return;
    await ssrExpect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  });

  // Link previews and crawlers read a post as an article: its own URL, dates, author and
  // topic in Open Graph, and the same facts as schema.org Article + BreadcrumbList JSON-LD.
  test('SSR-27 — post detail emits article Open Graph tags and Article JSON-LD', async ({ page }) => {
    await page.goto(`/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`);
    if (isRecordMode) return;
    const head = page.locator('head');
    await ssrExpect(head.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    const canonical = await head.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    await ssrExpect(head.locator('meta[property="og:url"]')).toHaveAttribute('content', canonical ?? '');
    for (const property of ['published_time', 'modified_time', 'section', 'tag']) {
      await expectSsrMetaContent(head.locator(`meta[property="article:${property}"]`).first());
    }
    await ssrExpect(head.locator('meta[property="article:author"]')).toHaveAttribute(
      'content',
      new RegExp(`/@${SUBSCRIBED_USER}$`)
    );

    const nodes = await jsonLdNodes(page);
    const article = nodes.find((node) => node['@type'] === 'Article');
    expect(article?.headline).toBeTruthy();
    expect(article?.mainEntityOfPage).toMatchObject({ '@id': canonical });
    const breadcrumb = nodes.find((node) => node['@type'] === 'BreadcrumbList');
    expect(breadcrumb?.itemListElement).toHaveLength(3);
  });

  test('SSR-28 — /@user emits og:type=profile and ProfilePage JSON-LD', async ({ page }) => {
    await page.goto(`/@${SUBSCRIBED_USER}`);
    if (isRecordMode) return;
    await ssrExpect(page.locator('head meta[property="og:type"]')).toHaveAttribute('content', 'profile');
    const profilePage = (await jsonLdNodes(page)).find((node) => node['@type'] === 'ProfilePage');
    expect(profilePage?.mainEntity).toMatchObject({ '@type': 'Person', identifier: SUBSCRIBED_USER });
  });

  test('SSR-29 — /@user/settings is noindex', async ({ page }) => {
    await page.goto(`/@${SUBSCRIBED_USER}/settings`);
    if (isRecordMode) return;
    await ssrExpect(page.locator('head meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow');
  });

  test('SSR-30 — no page emits a fb:app_id', async ({ page }) => {
    for (const path of ['/trending', `/${POST_CATEGORY}/@${SUBSCRIBED_USER}/${POST_PERMLINK}`]) {
      await page.goto(path);
      if (isRecordMode) continue;
      await ssrExpect(page.locator('meta[name="fb:app_id"], meta[property="fb:app_id"]')).toHaveCount(0);
    }
  });

  // User-profile SEO: generateMetadata (user-profile layout) sets og title +
  // image from the account — these MUST be in the server <head> for crawlers.
  test('SSR-21 — /@user emits og:title + og:image in the server <head>', async ({ page }) => {
    await page.goto(`/@${SUBSCRIBED_USER}`);
    await expectSsrMetaContent(page.locator('head meta[property="og:title"]'));
    await expectSsrMetaContent(page.locator('head meta[property="og:image"]'));
  });

  // A route-level loading.tsx would stream the post list into a hidden
  // Suspense segment that only client JS reveals, leaving a no-JS visitor
  // with the skeleton fallback.
  test('SSR-10 — /@user (blog tab) renders the account post list in server HTML', async ({
    page
  }) => {
    await page.goto(`/@${SUBSCRIBED_USER}`);
    await expectSsrNonEmpty(page.getByTestId('post-list-item').first());
  });

  // Classic search fetches find_text server-side when both q and s are present;
  // the results must be visible, not parked in a hidden streamed segment (see SSR-10).
  test('SSR-20 — /search renders classic results in server HTML', async ({ page }) => {
    await page.goto('/search?q=hive&s=relevance');
    await expectSsrNonEmpty(page.getByTestId('post-list-item').first());
  });
});

// ── Community profile (logged-in, JS disabled) ──────────────────────────────
test.describe('SSR — community profile (JS disabled)', () => {
  test.use({
    javaScriptEnabled: false,
    authenticatedUser: { username: SUBSCRIBED_USER },
    userAgent: REGULAR_BROWSER_USER_AGENT
  });

  test('SSR-08 — community feed renders the post list in server HTML', async ({ page }) => {
    await page.goto(`/trending/${COMMUNITY}`);
    await expectSsrNonEmpty(page.getByTestId('post-list-item').first());
  });

  // Community SEO: buildCommunityTagMetadata sets og title + image from the
  // community — these MUST be in the server <head> for crawlers.
  test('SSR-22 — community page emits og:title + og:image in the server <head>', async ({
    page
  }) => {
    await page.goto(`/trending/${COMMUNITY}`);
    await expectSsrMetaContent(page.locator('head meta[property="og:title"]'));
    await expectSsrMetaContent(page.locator('head meta[property="og:image"]'));
  });

  // The sidebar renders from the community data PrefetchComponent fetches on the
  // server; the subscriber list only fills its dialog once the client loads it.
  test('SSR-09 — community info sidebar renders in server HTML', async ({ page }) => {
    await page.goto(`/trending/${COMMUNITY}`);
    // The sidebar leads with the community title (dynamic data), so a non-empty
    // check on the container is meaningful here — no static-only header prefix.
    await expectSsrNonEmpty(page.getByTestId('community-info-sidebar'));
  });

  // On mobile the community card sits above the feed column: if it only appeared
  // after a client fetch it would push the whole feed down (layout shift).
  test('SSR-26 — mobile community card above the feed renders in server HTML', async ({ page }) => {
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto(`/trending/${COMMUNITY}`);
    await expectSsrNonEmpty(page.getByTestId('community-simple-description-sidebar'));
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
// SSR-11 and SSR-13 now pass the server fetch to the page as initialData and
// are normal assertions. SSR-12 is still a gap, marked `test.fail()` on replay
// so the suite stays green while documenting it. If someone makes it SSR its
// content, the test will start passing unexpectedly → flip it to a normal
// assertion and drop the marker. The marker is skipped while recording
// (assertions are gated off there, so the test would otherwise "pass" and trip
// the expected-failure).
test.describe('SSR — Hydrate-based pages (JS disabled, confirmed gaps)', () => {
  test.use({ javaScriptEnabled: false, authenticatedUser: { username: SUBSCRIBED_USER } });

  test('SSR-11 — /@user/communities renders the subscriptions list in server HTML', async ({
    page
  }) => {
    await page.goto(`/@${SUBSCRIBED_USER}/communities`);
    await expectSsrNonEmpty(page.getByTestId('author-community-subscribed-list-item').first());
  });

  test('SSR-12 — /@user/notifications renders notifications in server HTML', async ({ page }) => {
    test.fail(
      !isRecordMode,
      'SSR gap (#932): notifications are fetched server-side but rendered only after client hydration (React Query Hydrate)'
    );
    await page.goto(`/@${SUBSCRIBED_USER}/notifications`);
    await expectSsrNonEmpty(page.getByTestId('notification-list-item').first());
  });

  test('SSR-13 — /roles/[community] renders the roles table in server HTML', async ({ page }) => {
    await page.goto(`/roles/${SUBSCRIBED_COMMUNITY}`);
    // Target a real role row, not the table: the table has a static <thead>
    // that would render even with zero role rows.
    await expectSsrNonEmpty(page.getByTestId('community-role-row').first());
  });
});

// ── Crawl files ─────────────────────────────────────────────────────────────
// The fixture server leaves SEO_ALLOW_INDEXING unset, as every non-production site does.
test.describe('SSR — robots.txt & sitemap', () => {
  test('SSR-31 — /robots.txt disallows everything while indexing is not allowed', async ({ request }) => {
    const response = await request.get('/robots.txt');
    if (isRecordMode) return;
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toMatch(/^User-Agent: \*$/m);
    expect(text).toMatch(/^Disallow: \/$/m);
    expect(text).not.toMatch(/^Allow:/m);
  });

  test('SSR-32 — /sitemap.xml is a valid sitemap listing the static pages', async ({ page, request }) => {
    const response = await request.get('/sitemap.xml');
    if (isRecordMode) return;
    expect(response.status()).toBe(200);
    const xml = await response.text();
    const locs = await page.evaluate((text) => {
      const doc = new DOMParser().parseFromString(text, 'application/xml');
      if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'urlset') return null;
      return Array.from(doc.getElementsByTagName('loc'), (loc) => new URL(loc.textContent ?? '').pathname);
    }, xml);
    expect(locs).not.toBeNull();
    for (const path of ['/', '/trending', '/communities', '/faq.html', '/tos.html', '/privacy.html']) {
      expect(locs).toContain(path);
    }
  });
});

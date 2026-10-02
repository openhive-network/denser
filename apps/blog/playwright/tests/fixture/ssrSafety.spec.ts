import { test, expect } from '../support/fixture-proxy-test';
import { FIXTURE_COOKIE_PASSWORD } from '../support/fixture-auth/constants';
import type { APIResponse } from '@playwright/test';

/**
 * SSR safety checks — HTTP-level guarantees the server must hold BEFORE any
 * client JavaScript runs. These complement `ssrChecks.spec.ts` (which asserts
 * what the server *renders*) by asserting what the server *responds*: status
 * codes, response headers, and what must / must not be in the raw HTML.
 *
 * Level: pure HTTP (Playwright `request` API). No browser, no JS — exactly the
 * view a crawler, a CDN, or a curl gets. Requests hit the Next.js server on
 * :3000, which server-side-fetches chain data from the fixture proxy on :8200,
 * so these replay deterministically against the committed `ssrChecks` fixtures.
 *
 * Personalization is driven by the lightweight `observer` cookie (read first by
 * lib/auth-utils.ts `getObserver`), so a request-level test can log in simply by
 * sending `cookie: observer=<user>` — no sealed iron-session needed.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- ssrSafety
 */

const SUBSCRIBED_USER = 'guest4test1';
const POST_LIST_ITEM = 'data-testid="post-list-item"';

/**
 * Every page renders per request (the root layout reads cookies), so none may
 * tell a shared cache (CDN/proxy) to store it.
 */
function expectNotSharedCacheable(res: APIResponse, what: string) {
  const cacheControl = (res.headers()['cache-control'] ?? '').toLowerCase();

  expect(cacheControl, `missing Cache-Control on ${what}`).not.toBe('');
  expect(cacheControl, `${what} is publicly cacheable`).not.toContain('public');
  expect(cacheControl, `${what} allows shared-cache storage`).not.toContain('s-maxage');
  expect(
    /no-store|private|no-cache/.test(cacheControl),
    `expected a private/no-store directive on ${what}, got "${cacheControl}"`
  ).toBe(true);
}

/** Reuse the committed SSR fixture corpus (read-only on replay — safe to share). */
test.use({ fixtureTestName: 'ssrChecks' });

// ── Obszar 1 — correct HTTP status codes ────────────────────────────────────
// Note: HTTP 200 for existing routes is already proven by ssrChecks (SSR-01
// renders /trending's post list and SSR-16 the post article, both JS-off — which
// is only possible from a 200). The only status contract that needs its own test
// here is the 404 path below.
test.describe('SSR safety — HTTP status codes', () => {
  // A syntactically invalid Hive handle is rejected by `isUsernameValid`
  // (format-only, local WASM) → the post route calls `notFound()` BEFORE any
  // API call, so this needs no fixture. The contract is a real 404.
  //
  // This held as a soft-404 (HTTP 200 + not-found body) until the post route
  // stopped streaming (#930): the route-level loading.tsx committed the 200
  // before the page body ran, so notFound() could only swap the UI. With the
  // boundary removed the page decides the status again and the contract below
  // holds. (The middleware rewrite was ruled out as the cause — 2-segment
  // post routes returned real 404s under the same middleware all along.)
  test('SAFE-03 — a post URL with an invalid username responds 404', async ({ request }) => {
    const res = await request.get('/test/@Invalid_User/some-permlink');
    expect(res.status()).toBe(404);
  });
});

// ── Obszar 4 — no sensitive data leaks into the server HTML ──────────────────
test.describe('SSR safety — no secret leakage in server HTML', () => {
  // The server seals sessions into an iron-session cookie ("Fe26.2*…") and signs
  // with a posting WIF on the client only. NONE of that may ever be echoed into
  // the HTML the server streams to the page.
  const IRON_SEAL = 'Fe26.2'; // iron-session sealed-cookie prefix
  const WIF = /\b5[HJK][1-9A-HJ-NP-Za-km-z]{49}\b/; // Hive posting key format

  test('SAFE-04 — personalized feed HTML carries no session seal, WIF or cookie password', async ({
    request
  }) => {
    const res = await request.get('/trending/my', {
      headers: { cookie: `observer=${SUBSCRIBED_USER}` }
    });
    expect(res.status()).toBe(200);
    const html = await res.text();

    expect(html, 'iron-session seal leaked into HTML').not.toContain(IRON_SEAL);
    expect(html, 'cookie password leaked into HTML').not.toContain(FIXTURE_COOKIE_PASSWORD);
    expect(WIF.test(html), 'a WIF-shaped string leaked into HTML').toBe(false);
  });
});

// ── Obszar 9 — personalized SSR must never be globally cacheable ────────────
test.describe('SSR safety — cache headers & per-user isolation', () => {
  // Reading the `observer` cookie via next/headers `cookies()` opts the route
  // out of static rendering, so the personalized feed must come back with a
  // private / non-shared Cache-Control. A `public` or `s-maxage` here would let
  // a shared cache (CDN/proxy) serve user A's feed to user B.
  test('SAFE-05 — personalized /trending/my is not publicly cacheable', async ({ request }) => {
    const res = await request.get('/trending/my', {
      headers: { cookie: `observer=${SUBSCRIBED_USER}` }
    });
    expectNotSharedCacheable(res, 'personalized feed');
  });

  // Every other page is rendered on demand too (ƒ in the build's route table),
  // and the response must keep saying so. Next 15 changed caching defaults;
  // these pin the headers Next 14 sent. The community feed is requested as the
  // observer it was recorded for.
  const PAGES = [
    { what: 'feed', path: '/trending' },
    { what: 'post', path: `/test/@${SUBSCRIBED_USER}/test-ako-post` },
    { what: 'profile', path: `/@${SUBSCRIBED_USER}` },
    { what: 'community feed', path: '/trending/hive-160391', observer: SUBSCRIBED_USER }
  ];
  for (const { what, path, observer } of PAGES) {
    test(`SAFE-09 — ${what} ${path} is not publicly cacheable`, async ({ request }) => {
      const res = await request.get(path, {
        headers: observer ? { cookie: `observer=${observer}` } : {}
      });
      expect(res.status()).toBe(200);
      expectNotSharedCacheable(res, what);
    });
  }

  // /api/health is a static route handler. Next 15+ gives static handlers
  // `s-maxage=31536000` by default, which would let a proxy cache keep
  // answering "ok" for a dead app.
  test('SAFE-10 — /api/health is never stored by a cache', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    expectNotSharedCacheable(res, '/api/health');
    expect(res.headers()['cache-control']).toContain('no-store');
  });

  // Differential proof the response is rendered per-cookie, not served from one
  // shared document: the same URL yields the personalized subscribed feed for a
  // logged-in observer but the empty skip-prefetch branch for an anonymous one.
  test('SAFE-06 — /trending/my renders different HTML per observer cookie', async ({ request }) => {
    const loggedIn = await (
      await request.get('/trending/my', { headers: { cookie: `observer=${SUBSCRIBED_USER}` } })
    ).text();
    const anonymous = await (await request.get('/trending/my')).text();

    expect(loggedIn, 'logged-in feed should carry posts').toContain(POST_LIST_ITEM);
    expect(anonymous, 'anonymous skip-prefetch branch should carry no posts').not.toContain(
      POST_LIST_ITEM
    );
  });
});

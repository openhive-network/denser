import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import type { Page } from '@playwright/test';

/**
 * Hydration-correctness checks (Obszar 2).
 *
 * Unlike ssrChecks/ssrSafety (which run with JS disabled), these run with JS
 * ENABLED and watch the browser console + page errors while React hydrates the
 * server HTML. A hydration mismatch — server HTML diverging from the first
 * client render — is React's signal that something renders non-deterministically
 * across the server/client boundary (Date.now(), Math.random(), `window`/
 * `localStorage` read during render, server-vs-client data drift, invalid HTML
 * nesting). It degrades UX (flicker / re-render / lost state) and is a latent
 * bug source.
 *
 * In a production build React reports these as minified errors #418/#423/#425
 * (and logs the canonical text in dev), so we match both forms plus any
 * uncaught page error.
 *
 * ── Record vs replay ────────────────────────────────────────────────────────
 * With JS on, the browser also fetches client-side through the proxy, so the
 * fixtures must be recorded with JS on (a superset of the JS-off corpus).
 * Assertions are SKIPPED while recording: a failing assertion restarts the
 * Playwright worker and the record proxy rewrites the fixture dir on teardown,
 * which would wipe earlier tests' captures. Recording therefore only navigates;
 * the console assertions run on replay.
 *
 * Record:  FIXTURE_MODE=record FIXTURE_UPSTREAM=api.openhive.network \
 *            pnpm exec playwright test --config=playwright.fixture.config.ts ssrHydration
 * Replay:  pnpm --filter @hive/blog test:fixture -- ssrHydration
 */

const SUBSCRIBED_USER = 'guest4test1';
const POST_PATH = `/test/@${SUBSCRIBED_USER}/test-ako-post`;

/** React hydration-mismatch signatures: minified prod codes + dev text. */
const HYDRATION_ERROR =
  /Minified React error #(418|423|425|421|422)\b|hydrat|did not match|Text content does not match/i;

/**
 * Attach console + pageerror listeners, navigate, let the client settle, then
 * (on replay) assert no hydration error surfaced. Returns the collected errors.
 */
async function gotoAndCollectHydrationErrors(page: Page, url: string): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && HYDRATION_ERROR.test(msg.text())) {
      errors.push(`[console] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    if (HYDRATION_ERROR.test(err.message)) {
      errors.push(`[pageerror] ${err.message}`);
    }
  });

  await page.goto(url);
  // Let hydration + initial client fetches settle. networkidle covers the
  // React Query refetches that follow mount.
  await page.waitForLoadState('networkidle');
  return errors;
}

test.use({ fixtureTestName: 'ssrHydration' });

test.describe('Hydration — anonymous pages', () => {
  test('HYD-01 — /trending hydrates with no mismatch', async ({ page }) => {
    const errors = await gotoAndCollectHydrationErrors(page, '/trending');
    if (isRecordMode) return;
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('HYD-02 — post detail hydrates with no mismatch', async ({ page }) => {
    const errors = await gotoAndCollectHydrationErrors(page, POST_PATH);
    if (isRecordMode) return;
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('Hydration — logged-in personalized pages', () => {
  test.use({ authenticatedUser: { username: SUBSCRIBED_USER } });

  test('HYD-03 — personalized /trending/my hydrates with no mismatch', async ({ page }) => {
    const errors = await gotoAndCollectHydrationErrors(page, '/trending/my');
    if (isRecordMode) return;
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('HYD-04 — /@user profile hydrates with no mismatch', async ({ page }) => {
    const errors = await gotoAndCollectHydrationErrors(page, `/@${SUBSCRIBED_USER}`);
    if (isRecordMode) return;
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

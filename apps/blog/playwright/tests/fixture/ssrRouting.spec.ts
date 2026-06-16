import { test, expect, isRecordMode } from '../support/fixture-proxy-test';

/**
 * Routing & navigation checks (Obszar 5) — JS enabled.
 *
 * Verifies the App Router client navigation contract:
 *   - soft navigation (clicking a <Link>) swaps content WITHOUT a full document
 *     reload (a hard reload would wipe a window sentinel we set);
 *   - back / forward restore the right route + content;
 *   - F5 / reload on a deep subpage re-renders it via SSR (hard entry works);
 *   - the same destination reached by a hard URL and by a soft click renders the
 *     same content.
 *
 * Soft-nav target: the first feed post's title link (a plain <Link>, so it
 * navigates for anon users too — no login dialog). The destination post is
 * whatever the recorded /trending feed froze first; tests assert generically
 * (landed on a post detail, content matches) rather than pinning a permlink.
 *
 * ── Record vs replay ────────────────────────────────────────────────────────
 * Needs its own fixtures recorded with JS on (client soft-nav fetches the
 * destination's RSC payload, whose server render hits the proxy). Assertions are
 * gated off while recording (a failing assertion would restart the worker and
 * the record proxy would wipe the dir on teardown); navigation always runs so
 * every route's RPCs are captured.
 *
 * Record:  FIXTURE_MODE=record FIXTURE_UPSTREAM=api.openhive.network \
 *            pnpm exec playwright test --config=playwright.fixture.config.ts ssrRouting
 * Replay:  pnpm --filter @hive/blog test:fixture -- ssrRouting
 */

const FEED_PATH = '/trending';
const POST_LIST_ITEM = 'post-list-item';
const POST_TITLE = 'post-title';
const ARTICLE_TITLE = 'article-title';

/** Run an assertion only on replay (see header note on recording). */
async function onReplay(fn: () => Promise<void>): Promise<void> {
  if (isRecordMode) return;
  await fn();
}

// JS stays enabled (the default) — soft navigation needs the client router.
test.use({ fixtureTestName: 'ssrRouting' });

test.describe('Routing — App Router client navigation (JS enabled)', () => {
  test('ROUTE-01 — clicking a feed post soft-navigates (no full reload)', async ({ page }) => {
    await page.goto(FEED_PATH);
    const firstTitleLink = page.getByTestId(POST_TITLE).first().locator('a').first();
    await firstTitleLink.waitFor({ state: 'visible' });
    const href = await firstTitleLink.getAttribute('href');

    // Sentinel that only survives a soft (client-side) navigation.
    await page.evaluate(() => ((window as Window & { __nav?: string }).__nav = 'soft'));
    await firstTitleLink.click();
    await page.getByTestId(ARTICLE_TITLE).waitFor({ state: 'visible' });

    await onReplay(async () => {
      expect(href, 'feed post should link to a post URL').toMatch(/\/@[^/]+\//);
      expect(page.url(), 'URL should reflect the post route').toContain(href!);
      const survived = await page.evaluate(() => (window as Window & { __nav?: string }).__nav);
      expect(survived, 'soft nav must not full-reload the document').toBe('soft');
    });
  });

  test('ROUTE-02 — back / forward restore route + content', async ({ page }) => {
    await page.goto(FEED_PATH);
    const firstTitleLink = page.getByTestId(POST_TITLE).first().locator('a').first();
    await firstTitleLink.waitFor({ state: 'visible' });
    await page.evaluate(() => ((window as Window & { __nav?: string }).__nav = 'soft'));
    await firstTitleLink.click();
    await page.getByTestId(ARTICLE_TITLE).waitFor({ state: 'visible' });

    await page.goBack();
    await page.getByTestId(POST_LIST_ITEM).first().waitFor({ state: 'visible' });
    await onReplay(async () => {
      expect(page.url(), 'goBack should return to the feed').toContain(FEED_PATH);
      const survived = await page.evaluate(() => (window as Window & { __nav?: string }).__nav);
      expect(survived, 'back should be a soft navigation').toBe('soft');
    });

    await page.goForward();
    await page.getByTestId(ARTICLE_TITLE).waitFor({ state: 'visible' });
    await onReplay(async () => {
      expect(page.url(), 'goForward should return to the post').toMatch(/\/@[^/]+\//);
    });
  });

  test('ROUTE-03 — reload (F5) on a post re-renders it via SSR (hard entry)', async ({ page }) => {
    await page.goto(FEED_PATH);
    const firstTitleLink = page.getByTestId(POST_TITLE).first().locator('a').first();
    await firstTitleLink.waitFor({ state: 'visible' });
    await page.evaluate(() => ((window as Window & { __nav?: string }).__nav = 'soft'));
    await firstTitleLink.click();
    await page.getByTestId(ARTICLE_TITLE).waitFor({ state: 'visible' });

    await page.reload();
    await page.getByTestId(ARTICLE_TITLE).waitFor({ state: 'visible' });
    await onReplay(async () => {
      // The article still renders after a hard reload — the deep URL is fully
      // server-rendered on direct entry…
      await expect(page.getByTestId(ARTICLE_TITLE)).toBeVisible();
      // …and the sentinel is gone, proving this was a real document reload (not
      // the soft nav that put us here).
      const survived = await page.evaluate(() => (window as Window & { __nav?: string }).__nav);
      expect(survived, 'reload must be a full document load').toBeUndefined();
    });
  });

  test('ROUTE-04 — hard URL entry and soft click render the same post', async ({ page }) => {
    // Soft path: reach the post by clicking the feed.
    await page.goto(FEED_PATH);
    const firstTitleLink = page.getByTestId(POST_TITLE).first().locator('a').first();
    await firstTitleLink.waitFor({ state: 'visible' });
    const href = await firstTitleLink.getAttribute('href');
    await firstTitleLink.click();
    await page.getByTestId(ARTICLE_TITLE).waitFor({ state: 'visible' });
    const softTitle = (await page.getByTestId(ARTICLE_TITLE).textContent())?.trim();

    // Hard path: open the same URL directly.
    await page.goto(href!);
    await page.getByTestId(ARTICLE_TITLE).waitFor({ state: 'visible' });
    const hardTitle = (await page.getByTestId(ARTICLE_TITLE).textContent())?.trim();

    await onReplay(async () => {
      expect(softTitle, 'soft-nav rendered an article title').toBeTruthy();
      expect(hardTitle, 'hard-entry rendered the same article title').toBe(softTitle);
    });
  });
});

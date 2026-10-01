import fs from 'fs';
import path from 'path';
import { test, expect, isRecordMode } from '../support/fixture-proxy-test';
import type { Locator, Page } from '@playwright/test';

/**
 * SEO guard — the content of every main server-rendered entry point must sit in
 * the VISIBLE server HTML, not in a streaming container that only client JS
 * reveals.
 *
 * Why: under React 19 streaming, a Suspense boundary (e.g. a route-level
 * `loading.tsx`) whose content pushes the flushed HTML past React's chunk size
 * is "outlined": the fallback renders in place and the finished content is
 * emitted later inside `<div hidden id="S:…">` (or a `<template>`) that an
 * inline `$RC` script swaps in. A crawler or a no-JS client reading that HTML
 * gets the content hidden. This spec fails if that happens to any of the pages
 * below.
 *
 * Technique: JS disabled, so the DOM is exactly the parsed server response
 * (`$RC` never runs). For each recorded post we assert the link is in the raw
 * HTML, has no `hidden` / `<template>` ancestor and is visible.
 *
 * Head tags: `<title>`, meta description and OG tags are asserted in `<head>`.
 * No route sets a canonical link yet — that gap is tracked by ssrChecks SSR-24
 * (#903), so it is not asserted here.
 *
 * Fixtures: `ssrSeoGuard` is an additive overlay on `ssrChecks` composed from
 * other recordings (see its `_index.json`), so it can only be replayed.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- ssrSeoGuard
 */

test.use({ fixtureTestName: 'ssrSeoGuard', javaScriptEnabled: false });
test.skip(isRecordMode, 'replay-only: the ssrSeoGuard corpus is composed from other recordings');

const FIXTURES_ROOT = path.resolve(__dirname, '..', 'mock', 'fixtures');

interface IRecordedPost {
  title: string;
  category: string;
  author: string;
  permlink: string;
}

interface IRecordedResponse {
  response: { result: IRecordedPost[] };
}

/** Post-page hrefs of the posts a `bridge.get_ranked_posts` recording returned. */
function recordedPosts(recording: string): { title: string; href: string }[] {
  const raw: IRecordedResponse = JSON.parse(
    fs.readFileSync(path.join(FIXTURES_ROOT, recording), 'utf-8')
  );
  return raw.response.result.map(({ title, category, author, permlink }) => ({
    title: title.trim(),
    href: `/${category}/@${author}/${permlink}`
  }));
}

/** Navigates with JS off and returns the raw server HTML. */
async function serverHtml(page: Page, url: string): Promise<string> {
  const response = await page.goto(url);
  expect(response?.status(), `${url} status`).toBe(200);
  return (await response?.text()) ?? '';
}

/** Asserts `locator` is server-rendered outside any hidden streaming container. */
async function expectInVisibleServerHtml(locator: Locator, what: string): Promise<void> {
  await expect(locator, `${what} is missing from the server DOM`).toHaveCount(1);
  const hiddenAncestor = await locator.evaluate((el) => {
    const container = el.closest('[hidden], template');
    return container ? container.outerHTML.slice(0, 120) : null;
  });
  expect(hiddenAncestor, `${what} sits inside a hidden streaming container`).toBeNull();
  await expect(locator, `${what} is not visible`).toBeVisible();
}

async function expectHeadMeta(page: Page, selector: string): Promise<void> {
  await expect(page.locator(`head ${selector}`), `${selector} in <head>`).toHaveAttribute(
    'content',
    /\S/
  );
}

async function expectSeoHead(page: Page, title: string | RegExp): Promise<void> {
  await expect(page.locator('head > title')).toHaveCount(1);
  await expect(page).toHaveTitle(title);
  await expectHeadMeta(page, 'meta[name="description"]');
  await expectHeadMeta(page, 'meta[property="og:title"]');
  await expectHeadMeta(page, 'meta[property="og:image"]');
}

const FEEDS = [
  { id: 'SEO-01', url: '/trending', title: 'Trending posts - Hive', recording: 'ssrChecks/0002-bridge.get_ranked_posts.json' },
  { id: 'SEO-02', url: '/hot', title: 'Hot posts - Hive', recording: 'ssrSeoGuard/0001-bridge.get_ranked_posts.json' },
  { id: 'SEO-03', url: '/created', title: 'New posts - Hive', recording: 'ssrSeoGuard/0002-bridge.get_ranked_posts.json' },
  { id: 'SEO-04', url: '/trending/hive-139531', title: 'HiveDevs / trending - Hive', recording: 'ssrSeoGuard/0005-bridge.get_ranked_posts.json' },
  { id: 'SEO-05', url: '/trending/hive', title: '#hive / trending - Hive', recording: 'ssrSeoGuard/0006-bridge.get_ranked_posts.json' }
];

test.describe('SEO guard — feeds in visible server HTML (JS disabled)', () => {
  for (const feed of FEEDS) {
    test(`${feed.id} — ${feed.url} serves every recorded post visibly, with SEO head tags`, async ({
      page
    }) => {
      const posts = recordedPosts(feed.recording);
      expect(posts.length, 'recording carries posts').toBeGreaterThan(0);

      const html = await serverHtml(page, feed.url);
      const list = page.getByTestId('post-list-item');
      for (const post of posts) {
        expect(html, `raw HTML links ${post.href}`).toContain(`href="${post.href}"`);
        await expectInVisibleServerHtml(
          list.filter({ has: page.locator(`a[href="${post.href}"]`) }),
          `post card ${post.href}`
        );
      }
      await expect(list.getByTestId('post-title').first()).toHaveText(posts[0].title);

      await expectSeoHead(page, feed.title);
    });
  }
});

test.describe('SEO guard — post and profile pages (JS disabled)', () => {
  const POST_URL = '/test/@guest4test1/test-ako-post';
  const PROFILE_URL = '/@guest4test1';

  test('SEO-06 — post page serves the title and body text visibly, with SEO head tags', async ({
    page
  }) => {
    const html = await serverHtml(page, POST_URL);
    expect(html).toContain('Tidy the kitchen');

    await expectInVisibleServerHtml(page.getByTestId('article-title'), 'article title');
    await expect(page.getByTestId('article-title')).toHaveText(/Test ako post/);
    await expectInVisibleServerHtml(
      page.getByRole('listitem').filter({ hasText: /^Tidy the kitchen$/ }),
      'post body text'
    );

    await expectSeoHead(page, /^Test ako post\s+- Hive$/);
  });

  test('SEO-07 — profile page emits SEO head tags', async ({ page }) => {
    await serverHtml(page, PROFILE_URL);
    await expectSeoHead(page, 'Blog guest4test1 - Hive');
  });

  test('SEO-08 — profile page serves the account posts visibly', async ({ page }) => {
    test.fail(true, 'SSR gap (#932): the user-profile body is client-only (see ssrChecks SSR-10)');
    const [first] = recordedPosts('ssrChecks/0012-bridge.get_account_posts.json');
    await serverHtml(page, PROFILE_URL);
    await expectInVisibleServerHtml(
      page.getByTestId('post-title').locator(`a[href="${first.href}"]`),
      `post ${first.href}`
    );
  });
});

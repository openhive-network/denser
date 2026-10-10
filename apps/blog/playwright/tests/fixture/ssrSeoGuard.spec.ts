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
 * Head tags: `<title>`, meta description, OG tags and the canonical link are
 * asserted in `<head>`. The canonical is the page's own absolute URL on the
 * configured site domain (the root layout's `metadataBase`); a post's is, as in
 * condenser, its `json_metadata.canonical_url`, else its URL on the reciprocating
 * app that published it, else the URL under its own category, whatever prefix the
 * page was opened under.
 *
 * Node blips: a feed page must answer either with its posts (200) or with a
 * retryable 503 — never a 200 that only carries the loading skeleton, which a
 * crawler would index as an empty feed. `fixtureProxy.failRequests` drops the
 * server's `bridge.get_ranked_posts` connection once (the server must retry)
 * or every time (the server must answer 503 with `Retry-After`).
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

// The site domain the server's root layout resolves canonical links against: the
// fixture webServer inherits this process's env, so it sees the same value.
const SITE_DOMAIN = process.env.REACT_APP_SITE_DOMAIN || 'https://hive.blog';

/** Absolute URL of `pathname` on the configured site, base path included. */
function siteUrl(pathname: string): string {
  return `${SITE_DOMAIN.replace(/\/+$/, '')}${pathname}`;
}

const isRankedPostsCall = ({ method }: { method: string }) => method === 'bridge.get_ranked_posts';

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

async function expectCanonicalHref(page: Page, href: string): Promise<void> {
  const canonical = page.locator('head link[rel="canonical"]');
  await expect(canonical, 'one canonical link in <head>').toHaveCount(1);
  await expect(canonical).toHaveAttribute('href', href);
}

async function expectCanonical(page: Page, pathname: string): Promise<void> {
  await expectCanonicalHref(page, siteUrl(pathname));
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
      await expectCanonical(page, feed.url);
    });
  }
});

test.describe('SEO guard — feeds under API node failures (JS disabled)', () => {
  for (const feed of FEEDS) {
    test(`${feed.id}-RETRY — ${feed.url} still serves its posts when the first feed fetch fails`, async ({
      page,
      fixtureProxy
    }) => {
      const posts = recordedPosts(feed.recording);
      const restore = fixtureProxy.failRequests(isRankedPostsCall, 1);
      try {
        const html = await serverHtml(page, feed.url);
        for (const post of posts) {
          expect(html, `raw HTML links ${post.href}`).toContain(`href="${post.href}"`);
        }
      } finally {
        restore();
      }
    });

    test(`${feed.id}-503 — ${feed.url} answers 503 with Retry-After, not a post-less 200, while the feed stays unreachable`, async ({
      request,
      fixtureProxy
    }) => {
      const restore = fixtureProxy.failRequests(isRankedPostsCall);
      try {
        const response = await request.get(feed.url);
        expect(response.status(), `${feed.url} status`).toBe(503);
        expect(response.headers()['retry-after'], 'Retry-After header').toMatch(/^\d+$/);
        expect(await response.text()).not.toContain('data-testid="post-list-item"');
      } finally {
        restore();
      }
    });
  }
});

test.describe('SEO guard — post and profile pages (JS disabled)', () => {
  const POST_URL = '/test/@guest4test1/test-ako-post';
  const PROFILE_URL = '/@guest4test1';

  // The recorded post's app is "hive.blog/0.9", outside the reciprocating whitelist, and it
  // has no canonical_url: its canonical is its own URL on the configured site.
  test('SEO-06 — post page serves the title and body text visibly, with SEO head tags and canonical', async ({
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
    await expectCanonical(page, POST_URL);
  });

  test('SEO-09 — post opened under another prefix points its canonical at its own category', async ({
    page
  }) => {
    await serverHtml(page, '/trending/@guest4test1/test-ako-post');
    await expectCanonical(page, POST_URL);
  });

  test('SEO-10 — cross-posted post points its canonical at json_metadata.canonical_url', async ({
    page
  }) => {
    // Recorded with app "hivecomb/1.0" (not reciprocating) and a hivecomb.net canonical_url.
    await serverHtml(
      page,
      '/pevo-blog/@pevo.science/publish-and-evaluate-openly-pevo-science-open-beta-officially-launched'
    );
    await expectCanonicalHref(
      page,
      'https://hivecomb.net/@pevo.science/publish-and-evaluate-openly-pevo-science-open-beta-officially-launched'
    );
  });

  test('SEO-11 — post from a reciprocating app without canonical_url points its canonical at that app', async ({
    page
  }) => {
    // Recorded with app "peakd/2026.3.4" and no canonical_url.
    await serverHtml(page, '/trending/@dlmmqb/behind-the-scenes-and-more-coding-hive-engine-hive');
    await expectCanonicalHref(
      page,
      'https://peakd.com/hive-153850/@dlmmqb/behind-the-scenes-and-more-coding-hive-engine-hive'
    );
  });

  test('SEO-07 — profile page emits SEO head tags and canonical', async ({ page }) => {
    await serverHtml(page, PROFILE_URL);
    await expectSeoHead(page, 'Blog guest4test1 - Hive');
    await expectCanonical(page, PROFILE_URL);
  });

  // Tabs outside the profile and posts-tabs layouts set their own metadata; each must
  // still point its canonical at its own URL, not inherit none.
  const PROFILE_TABS = [
    { id: 'SEO-12', url: '/@hiveio/replies' },
    { id: 'SEO-13', url: `${PROFILE_URL}/communities` }
  ];
  for (const tab of PROFILE_TABS) {
    test(`${tab.id} — ${tab.url} emits its own canonical`, async ({ page }) => {
      await serverHtml(page, tab.url);
      await expectCanonical(page, tab.url);
    });
  }

  test('SEO-08 — profile page serves the account posts visibly', async ({ page }) => {
    const [first] = recordedPosts('ssrChecks/0012-bridge.get_account_posts.json');
    await serverHtml(page, PROFILE_URL);
    await expectInVisibleServerHtml(
      page.getByTestId('post-title').locator(`a[href="${first.href}"]`),
      `post ${first.href}`
    );
  });
});

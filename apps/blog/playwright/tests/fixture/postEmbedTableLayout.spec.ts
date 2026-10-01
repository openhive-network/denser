import type { Page } from '@playwright/test';
import { test, expect } from '../support/fixture-proxy-test';
import { PostPage } from '../support/pages/postPage';

/**
 * Embed table layout — screenshot guard for the CSS layout of a markdown
 * table whose cells hold Twitter/X and Instagram embeds.
 *
 * Post data replays from the `postEmbedTableLayout` recording. The embed
 * iframes are served a blank page, so they never post the resize messages
 * (TwitterMessageResizePlugin / InstagramResizePlugin) that set their height
 * from live third-party content: each keeps the stylesheet's fixed size and
 * the screenshot depends only on the table's own layout. Embed placement is
 * covered structurally by e2e/postRenderingVisual.spec.ts.
 *
 * Record:  FIXTURE_MODE=record pnpm exec playwright test --config=playwright.fixture.config.ts postEmbedTableLayout
 * Replay:  pnpm --filter @hive/blog test:fixture -- postEmbedTableLayout
 */

test.use({ fixtureTestName: 'postEmbedTableLayout' });

const EMBED_FRAME_ORIGINS = [
  'https://platform.twitter.com/**',
  'https://www.instagram.com/**',
  'https://instagram.com/**'
];

// 1 standalone tweet + 3 tweets and 3 Instagram posts in the table
const EMBED_IFRAME_COUNT = 7;

async function stubEmbedFrames(page: Page): Promise<void> {
  for (const origin of EMBED_FRAME_ORIGINS) {
    await page.route(origin, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html><body></body></html>' })
    );
  }
}

test.describe('Embed table layout (fixture-based)', () => {
  const community = 'test';
  const author = 'guest4test1';
  const permlink = 'test-twitter-and-insta-embeds';

  test('table with embeds renders correct layout', async ({ page }) => {
    const postPage = new PostPage(page);
    await stubEmbedFrames(page);

    await page.goto(`/${community}/@${author}/${permlink}/`, { waitUntil: 'domcontentloaded' });
    await postPage.waitForPostHydration();

    await expect(postPage.articleTable).toBeVisible();
    await expect(postPage.articleIframes).toHaveCount(EMBED_IFRAME_COUNT);

    await expect(postPage.articleBody).toHaveScreenshot('embed-table-layout.png', {
      mask: [postPage.articleIframes],
      maxDiffPixelRatio: 0.01
    });
  });
});

import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';
import { chromiumOnly } from '../support/testHelpers';

/**
 * Visual regression tests for post content rendering.
 *
 * Uses screenshot comparison to detect layout regressions
 * (e.g. two-column text layout, image placement, embed table layout).
 */

const twoColumnPosts = [
  {
    community: 'hive-148441',
    author: 'josehany',
    permlink: 'the-waiting-is-over',
    snapshot: 'two-column-post-body.png'
  },
  {
    community: 'hive-148441',
    author: 'josehany',
    permlink: 'at-my-own-pace',
    snapshot: 'two-column-at-my-own-pace.png'
  },
  {
    community: 'hive-163772',
    author: 'belkyscabrera',
    permlink: 'my-tour-of-the-eastern-region-visiting-its-beautiful-beaches-and-mountain-area-eng-esp-8gd',
    snapshot: 'two-column-my-tour-of-the-eastern-region.png'
  }
];

test.describe('Post rendering visual regression', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  for (const post of twoColumnPosts) {
    test(`two-column post renders correctly: ${post.permlink}`, async ({ page, browserName }) => {
      chromiumOnly(browserName);

      await postPage.gotoPostPage(post.community, post.author, post.permlink);
      await expect(postPage.articleBody).toBeVisible();
      await page.waitForLoadState('networkidle');

      await postPage.waitForArticleImages();

      await expect(postPage.articleBody).toHaveScreenshot(post.snapshot, {
        maxDiffPixelRatio: 0.01
      });
    });
  }
});

test.describe('Embed table layout regression', () => {
  const fixturePost = {
    community: 'test',
    author: 'guest4test1',
    permlink: 'test-twitter-and-insta-embeds'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('table with Twitter and Instagram embeds has correct structure', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    // Wait for embeds to render instead of relying on networkidle
    await expect(postPage.articleTable).toBeAttached({ timeout: TIMEOUTS.PAGE_LOAD });

    // Total twitter wrappers in article: 4 (1 standalone + 3 in table)
    await expect(postPage.twitterWrappers).toHaveCount(4, { timeout: TIMEOUTS.TWITTER_PLUGIN_SETTLE });

    // Table contains exactly 3 Twitter embeds
    const tableTwitterWrappers = postPage.getTwitterWrappersIn(postPage.articleTable);
    await expect(tableTwitterWrappers).toHaveCount(3, { timeout: TIMEOUTS.TWITTER_PLUGIN_SETTLE });

    // Table contains exactly 3 Instagram embeds
    const tableInstagramWrappers = postPage.getInstagramWrappersIn(postPage.articleTable);
    await expect(tableInstagramWrappers).toHaveCount(3, { timeout: TIMEOUTS.TWITTER_PLUGIN_SETTLE });

    // Each Twitter embed is inside a <td>
    for (let i = 0; i < 3; i++) {
      const td = tableTwitterWrappers.nth(i).locator('xpath=ancestor::td');
      await expect(td).toBeAttached();
    }

    // Each Instagram embed is inside a <td>
    for (let i = 0; i < 3; i++) {
      const td = tableInstagramWrappers.nth(i).locator('xpath=ancestor::td');
      await expect(td).toBeAttached();
    }

    // Verify table CSS properties for proper rendering
    await expect(postPage.articleTable).toHaveCSS('border-collapse', 'collapse');
  });

  test('table with embeds renders correct layout', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    // Wait for all embeds to render before taking screenshot
    await expect(postPage.twitterWrappers).toHaveCount(4, { timeout: TIMEOUTS.TWITTER_PLUGIN_SETTLE });

    // Extra buffer for TwitterResizePlugin to settle after embeds appear.
    // The Twitter widget fires multiple resize events after initial render;
    // there is no deterministic event to wait for, so a timeout is necessary.
    await page.waitForTimeout(TIMEOUTS.TWITTER_PLUGIN_SETTLE);

    // Mask all iframes to avoid flakiness from external embed content
    const iframes = await postPage.articleIframes.all();

    await expect(postPage.articleBody).toHaveScreenshot('embed-table-layout.png', {
      mask: iframes,
      maxDiffPixelRatio: 0.01
    });
  });
});

import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';

test.describe('Twitter/X and Instagram embed completeness', () => {
  // Post with known Twitter/X embed (and potentially Instagram)
  const testPost = {
    community: 'hive-134382',
    author: 'jocieprosza',
    permlink: 'taapjk'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('Twitter/X embed should not be clipped - content fits within iframe', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');

    await postPage.gotoPostPage(testPost.community, testPost.author, testPost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const twitterIframes = page.locator('#articleBody .twitterWrapper iframe');
    const count = await twitterIframes.count();

    // Skip if no Twitter embeds found (post content may change)
    test.skip(count === 0, 'No Twitter embeds found in this post');

    for (let i = 0; i < count; i++) {
      const iframeLocator = twitterIframes.nth(i);
      await expect(iframeLocator).toBeAttached({ timeout: 15000 });

      // Access iframe content via frameLocator (Playwright handles cross-origin)
      const frame = page.frameLocator('#articleBody .twitterWrapper iframe').nth(i);

      // Wait for tweet content to render inside the iframe
      // Twitter embed pages use <article> for tweet content
      await frame.locator('article').waitFor({ state: 'visible', timeout: 30000 });

      // Get the actual content height INSIDE the iframe
      const contentHeight = await frame.locator('html').evaluate((el) => el.scrollHeight);

      // Get the visible iframe height in the parent page
      const iframeVisibleHeight = await iframeLocator.evaluate((el) => el.clientHeight);

      // The iframe must be tall enough to show all content
      // If contentHeight > iframeVisibleHeight, the embed is clipped
      expect(
        iframeVisibleHeight,
        `Twitter embed #${i + 1} is clipped: content height (${contentHeight}px) ` +
          `exceeds iframe visible height (${iframeVisibleHeight}px)`
      ).toBeGreaterThanOrEqual(contentHeight);
    }
  });

  test('Instagram embed should not be clipped - content fits within iframe', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');

    await postPage.gotoPostPage(testPost.community, testPost.author, testPost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const instagramIframes = page.locator('#articleBody .instagramWrapper iframe');
    const count = await instagramIframes.count();

    test.skip(count === 0, 'No Instagram embeds found in this post');

    for (let i = 0; i < count; i++) {
      const iframeLocator = instagramIframes.nth(i);
      await expect(iframeLocator).toBeAttached({ timeout: 15000 });

      const frame = page.frameLocator('#articleBody .instagramWrapper iframe').nth(i);

      // Instagram embeds render main content in a container
      await frame.locator('body').waitFor({ state: 'visible', timeout: 30000 });
      // Give Instagram's JS time to fully render
      await page.waitForTimeout(3000);

      const contentHeight = await frame.locator('html').evaluate((el) => el.scrollHeight);

      const iframeVisibleHeight = await iframeLocator.evaluate((el) => el.clientHeight);

      expect(
        iframeVisibleHeight,
        `Instagram embed #${i + 1} is clipped: content height (${contentHeight}px) ` +
          `exceeds iframe visible height (${iframeVisibleHeight}px)`
      ).toBeGreaterThanOrEqual(contentHeight);
    }
  });
});

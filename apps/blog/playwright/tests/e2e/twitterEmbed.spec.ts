import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';

test.describe('Twitter/X embed completeness', () => {
  const twitterPost = {
    community: 'hive-134382',
    author: 'jocieprosza',
    permlink: 'taapjk'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('Twitter/X embed should not be clipped - content fits within visible area', async ({
    page,
    browserName
  }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');

    await postPage.gotoPostPage(twitterPost.community, twitterPost.author, twitterPost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const twitterWrappers = page.locator('#articleBody .twitterWrapper');
    const wrapperCount = await twitterWrappers.count();

    test.skip(wrapperCount === 0, 'No Twitter embeds found in this post');

    for (let i = 0; i < wrapperCount; i++) {
      const wrapper = twitterWrappers.nth(i);

      // Scroll embed into view so the browser loads iframe content
      await wrapper.scrollIntoViewIfNeeded();

      // TwitterResizePlugin (LOAD_TIMEOUT_MS = 10s) replaces the original iframe
      // with a native widget iframe via twttr.widgets.createTweet().
      // Wait for the plugin to finish before inspecting the wrapper.
      await page.waitForTimeout(15000);

      // After the plugin settles, the wrapper contains either:
      // - A new widget iframe (native widget rendered successfully, original removed)
      // - The original iframe (widgets.js failed to load)
      const visibleIframe = wrapper.locator('iframe:visible');
      const iframeCount = await visibleIframe.count();

      if (iframeCount === 0) {
        // Plugin hid the iframe but widget didn't render — unexpected state
        expect(iframeCount, `Twitter embed #${i + 1}: no visible iframe found after plugin settled`).toBeGreaterThan(
          0
        );
        continue;
      }

      const iframeLocator = visibleIframe.first();
      const box = await iframeLocator.boundingBox();
      expect(box, `Twitter embed #${i + 1} should have a bounding box`).not.toBeNull();

      // Native widget iframes auto-size and are not constrained by the 600px CSS rule
      // (CSS targets .twitterWrapper > iframe but widget creates a nested structure).
      // For fallback iframes, check scrollHeight vs clientHeight for clipping.
      const src = (await iframeLocator.getAttribute('src')) ?? '';
      const isFallbackIframe = src.includes('platform.twitter.com/embed/Tweet.html');

      if (isFallbackIframe) {
        const frame = iframeLocator.contentFrame();
        await frame.locator('article').waitFor({ state: 'visible', timeout: 30000 });

        const contentHeight = await frame.locator('html').evaluate((el) => el.scrollHeight);
        const iframeVisibleHeight = await iframeLocator.evaluate((el) => el.clientHeight);

        expect(
          iframeVisibleHeight,
          `Twitter embed #${i + 1} is clipped: content height (${contentHeight}px) ` +
            `exceeds iframe visible height (${iframeVisibleHeight}px)`
        ).toBeGreaterThanOrEqual(contentHeight);
      } else {
        // Native widget — auto-sized, just verify reasonable height
        expect(
          box!.height,
          `Twitter widget #${i + 1} has suspiciously small height (${box!.height}px)`
        ).toBeGreaterThan(100);
      }
    }
  });
});

test.describe('Instagram embed completeness', () => {
  const instagramPost = {
    community: 'test',
    author: 'guest4test1',
    permlink: 'test-instagram-x'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('Instagram embed should not be clipped - content fits within iframe', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');
    test.skip(browserName === 'firefox', 'Automatic test works well on chromium');

    await postPage.gotoPostPage(instagramPost.community, instagramPost.author, instagramPost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const instagramIframes = page.locator('#articleBody .instagramWrapper iframe');
    const count = await instagramIframes.count();

    test.skip(count === 0, 'No Instagram embeds found in this post');

    for (let i = 0; i < count; i++) {
      const wrapperLocator = page.locator('#articleBody .instagramWrapper').nth(i);
      const iframeLocator = instagramIframes.nth(i);

      // Scroll embed into view so the browser loads iframe content
      await wrapperLocator.scrollIntoViewIfNeeded();
      await expect(iframeLocator).toBeAttached({ timeout: 15000 });

      const frame = iframeLocator.contentFrame();

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

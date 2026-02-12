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

      // TwitterResizePlugin replaces the iframe with a native widget via widgets.js.
      // Wait for either: native widget to render, or fallback iframe to stay visible.
      const nativeWidget = wrapper.locator('twitter-widget');
      const fallbackIframe = wrapper.locator('> iframe');

      // Wait up to 15s for native widget; if not, fallback iframe should be there
      const widgetAppeared = await nativeWidget
        .first()
        .waitFor({ state: 'attached', timeout: 15000 })
        .then(() => true)
        .catch(() => false);

      if (widgetAppeared) {
        // Native widget auto-sizes — verify it rendered with reasonable dimensions
        await expect(nativeWidget.first()).toBeVisible({ timeout: 10000 });
        const box = await nativeWidget.first().boundingBox();
        expect(box, `Twitter widget #${i + 1} should be visible`).not.toBeNull();
        expect(
          box!.height,
          `Twitter widget #${i + 1} has suspiciously small height (${box!.height}px)`
        ).toBeGreaterThan(100);
      } else {
        // Fallback: original iframe still visible — check for clipping
        const iframeLocator = fallbackIframe.first();
        await expect(iframeLocator).toBeVisible({ timeout: 10000 });

        const frame = iframeLocator.contentFrame();
        await frame.locator('article').waitFor({ state: 'visible', timeout: 30000 });

        const contentHeight = await frame.locator('html').evaluate((el) => el.scrollHeight);
        const iframeVisibleHeight = await iframeLocator.evaluate((el) => el.clientHeight);

        expect(
          iframeVisibleHeight,
          `Twitter embed #${i + 1} is clipped: content height (${contentHeight}px) ` +
            `exceeds iframe visible height (${iframeVisibleHeight}px)`
        ).toBeGreaterThanOrEqual(contentHeight);
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
      const iframeLocator = instagramIframes.nth(i);
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

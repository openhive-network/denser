import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';
import { assertDefined } from '../support/testHelpers';

/**
 * Regression tests for media embed rendering in the blog post renderer.
 *
 * Uses a dedicated fixture post that contains YouTube, 3Speak, Twitter/X,
 * and Instagram embeds:
 *   /test/@guest4test1/test-con-den-post
 */

const fixturePost = {
  community: 'test',
  author: 'guest4test1',
  permlink: 'test-con-den-post'
};

test.describe('Renderer media embeds', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();
  });

  test('YouTube embed renders with correct video ID', async ({ page }) => {
    // On published posts, YouTube facades are auto-replaced with iframes on mount.
    // Look for the resulting iframe inside .videoWrapper.
    const youtubeIframe = page.locator(
      '#articleBody .videoWrapper iframe[src*="youtube.com/embed/a3ICNMQW7Ok"]'
    );

    await expect(youtubeIframe).toBeAttached({ timeout: 10000 });

    const src = await youtubeIframe.getAttribute('src');
    expect(src).toContain('a3ICNMQW7Ok');
  });

  test('YouTube embed iframe is playable', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'YouTube iframe interaction tested on chromium only');

    const youtubeIframe = page.locator(
      '#articleBody .videoWrapper iframe[src*="youtube.com/embed/a3ICNMQW7Ok"]'
    );

    await expect(youtubeIframe).toBeAttached({ timeout: 10000 });

    // Verify the iframe has allowfullscreen and proper dimensions
    await expect(youtubeIframe).toHaveAttribute('allowfullscreen', 'allowfullscreen');

    const box = await youtubeIframe.boundingBox();
    assertDefined(box, 'YouTube iframe should have a bounding box');
    expect(box.width).toBeGreaterThan(100);
    expect(box.height).toBeGreaterThan(50);
  });

  test('3Speak embed renders with correct video reference', async ({ page }) => {
    const threeSpeakIframe = page.locator('#articleBody iframe[src*="3speak.tv/embed"]');

    await expect(threeSpeakIframe).toBeAttached({ timeout: 10000 });

    const src = await threeSpeakIframe.getAttribute('src');
    expect(src).toContain('jongolson/vhtttbyf');
  });

  test('Twitter/X embed renders inside twitterWrapper', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Twitter embed relies on platform JS, tested on chromium');
    test.skip(browserName === 'firefox', 'Twitter embed relies on platform JS, tested on chromium');

    const twitterWrapper = page.locator('#articleBody .twitterWrapper');
    await expect(twitterWrapper).toBeAttached({ timeout: 10000 });

    // TwitterResizePlugin may replace the initial iframe with a native widget.
    // Poll until at least one visible iframe appears (replaces hardcoded timeout).
    const visibleIframe = twitterWrapper.locator('iframe:visible');
    await expect(visibleIframe).toHaveCount(1, { timeout: TIMEOUTS.TWITTER_PLUGIN_SETTLE });
  });

  test('Instagram embed renders inside instagramWrapper', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Instagram embed tested on chromium');
    test.skip(browserName === 'firefox', 'Instagram embed tested on chromium');

    const instagramWrapper = page.locator('#articleBody .instagramWrapper');
    await expect(instagramWrapper).toBeAttached({ timeout: 10000 });

    const instagramIframe = instagramWrapper.locator('iframe');
    await expect(instagramIframe).toBeAttached({ timeout: 10000 });

    const src = await instagramIframe.getAttribute('src');
    expect(src).toContain('instagram.com');
  });

  test('All four embed types are present simultaneously', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Embed integration tested on chromium');
    test.skip(browserName === 'firefox', 'Embed integration tested on chromium');

    // YouTube — facade is auto-replaced with iframe on mount (post may have multiple)
    const youtube = page.locator('#articleBody .videoWrapper iframe[src*="youtube.com/embed"]').first();

    // 3Speak
    const threeSpeak = page.locator('#articleBody iframe[src*="3speak.tv/embed"]').first();

    // Twitter/X
    const twitter = page.locator('#articleBody .twitterWrapper').first();

    // Instagram
    const instagram = page.locator('#articleBody .instagramWrapper').first();

    await expect(youtube).toBeAttached({ timeout: 10000 });
    await expect(threeSpeak).toBeAttached({ timeout: 10000 });
    await expect(twitter).toBeAttached({ timeout: 10000 });
    await expect(instagram).toBeAttached({ timeout: 10000 });
  });
});

/**
 * Responsiveness regression tests for media embeds (issue #508).
 *
 * Verifies that YouTube, Twitter/X, and Instagram embeds do not overflow
 * the article body on narrow (mobile) viewports.
 */
test.describe('Embed responsiveness on narrow viewport', () => {
  const MOBILE_WIDTH = 430;
  const MOBILE_HEIGHT = 971;

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: MOBILE_WIDTH, height: MOBILE_HEIGHT });
    postPage = new PostPage(page);
    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();
  });

  test('YouTube embed does not overflow article body on mobile', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Responsiveness test runs on chromium only');

    const youtubeWrapper = page.locator('#articleBody .videoWrapper').first();
    await expect(youtubeWrapper).toBeAttached({ timeout: 10000 });

    const articleBox = await postPage.articleBody.boundingBox();
    const wrapperBox = await youtubeWrapper.boundingBox();
    assertDefined(articleBox, 'Article body should have a bounding box');
    assertDefined(wrapperBox, 'YouTube wrapper should have a bounding box');

    expect(
      wrapperBox.width,
      `YouTube wrapper (${wrapperBox.width}px) should not exceed article body (${articleBox.width}px)`
    ).toBeLessThanOrEqual(articleBox.width + 1);
  });

  test('Twitter embed does not overflow article body on mobile', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Responsiveness test runs on chromium only');

    const twitterWrapper = page.locator('#articleBody .twitterWrapper').first();
    await expect(twitterWrapper).toBeAttached({ timeout: 10000 });

    // Poll until TwitterResizePlugin has settled and wrapper fits within article body
    await expect
      .poll(
        async () => {
          const articleBox = await postPage.articleBody.boundingBox();
          const wrapperBox = await twitterWrapper.boundingBox();
          if (!articleBox || !wrapperBox) return false;
          return wrapperBox.width <= articleBox.width + 1;
        },
        {
          message: 'Twitter wrapper should not exceed article body width on mobile',
          timeout: TIMEOUTS.TWITTER_PLUGIN_SETTLE
        }
      )
      .toBeTruthy();
  });

  test('Instagram embed does not overflow article body on mobile', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Responsiveness test runs on chromium only');

    const instagramWrapper = page.locator('#articleBody .instagramWrapper').first();
    await expect(instagramWrapper).toBeAttached({ timeout: 10000 });

    const articleBox = await postPage.articleBody.boundingBox();
    const wrapperBox = await instagramWrapper.boundingBox();
    assertDefined(articleBox, 'Article body should have a bounding box');
    assertDefined(wrapperBox, 'Instagram wrapper should have a bounding box');

    expect(
      wrapperBox.width,
      `Instagram wrapper (${wrapperBox.width}px) should not exceed article body (${articleBox.width}px)`
    ).toBeLessThanOrEqual(articleBox.width + 1);
  });
});

/**
 * Tablet viewport responsiveness tests for media embeds.
 *
 * Verifies that embeds do not overflow on a 768px tablet breakpoint,
 * complementing the 430px mobile tests above.
 */
test.describe('Embed responsiveness on tablet viewport', () => {
  const TABLET_WIDTH = 768;
  const TABLET_HEIGHT = 1024;

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: TABLET_WIDTH, height: TABLET_HEIGHT });
    postPage = new PostPage(page);
    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();
  });

  test('YouTube embed does not overflow article body on tablet', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Responsiveness test runs on chromium only');

    const youtubeWrapper = page.locator('#articleBody .videoWrapper').first();
    await expect(youtubeWrapper).toBeAttached({ timeout: 10000 });

    const articleBox = await postPage.articleBody.boundingBox();
    const wrapperBox = await youtubeWrapper.boundingBox();
    assertDefined(articleBox, 'Article body should have a bounding box');
    assertDefined(wrapperBox, 'YouTube wrapper should have a bounding box');

    expect(
      wrapperBox.width,
      `YouTube wrapper (${wrapperBox.width}px) should not exceed article body (${articleBox.width}px) on tablet`
    ).toBeLessThanOrEqual(articleBox.width + 1);
  });

  test('Twitter embed does not overflow article body on tablet', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Responsiveness test runs on chromium only');

    const twitterWrapper = page.locator('#articleBody .twitterWrapper').first();
    await expect(twitterWrapper).toBeAttached({ timeout: 10000 });

    // Poll until TwitterResizePlugin has settled and wrapper fits within article body
    await expect
      .poll(
        async () => {
          const articleBox = await postPage.articleBody.boundingBox();
          const wrapperBox = await twitterWrapper.boundingBox();
          if (!articleBox || !wrapperBox) return false;
          return wrapperBox.width <= articleBox.width + 1;
        },
        {
          message: 'Twitter wrapper should not exceed article body width on tablet',
          timeout: TIMEOUTS.TWITTER_PLUGIN_SETTLE
        }
      )
      .toBeTruthy();
  });

  test('Instagram embed does not overflow article body on tablet', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Responsiveness test runs on chromium only');

    const instagramWrapper = page.locator('#articleBody .instagramWrapper').first();
    await expect(instagramWrapper).toBeAttached({ timeout: 10000 });

    const articleBox = await postPage.articleBody.boundingBox();
    const wrapperBox = await instagramWrapper.boundingBox();
    assertDefined(articleBox, 'Article body should have a bounding box');
    assertDefined(wrapperBox, 'Instagram wrapper should have a bounding box');

    expect(
      wrapperBox.width,
      `Instagram wrapper (${wrapperBox.width}px) should not exceed article body (${articleBox.width}px) on tablet`
    ).toBeLessThanOrEqual(articleBox.width + 1);
  });
});

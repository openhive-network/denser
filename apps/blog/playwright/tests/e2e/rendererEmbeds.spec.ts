import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';

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
    expect(box, 'YouTube iframe should have a bounding box').not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(50);
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
    // Wait for the plugin to settle (LOAD_TIMEOUT_MS = 10s + buffer).
    await page.waitForTimeout(15000);

    // After settling, there should be at least one visible iframe
    // (either fallback platform.twitter.com or native widget iframe).
    const visibleIframe = twitterWrapper.locator('iframe:visible');
    const iframeCount = await visibleIframe.count();
    expect(iframeCount, 'Twitter wrapper should contain at least one visible iframe').toBeGreaterThan(0);
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

    // YouTube — facade is auto-replaced with iframe on mount
    const youtube = page.locator('#articleBody .videoWrapper iframe[src*="youtube.com/embed"]');

    // 3Speak
    const threeSpeak = page.locator('#articleBody iframe[src*="3speak.tv/embed"]');

    // Twitter/X
    const twitter = page.locator('#articleBody .twitterWrapper');

    // Instagram
    const instagram = page.locator('#articleBody .instagramWrapper');

    await expect(youtube).toBeAttached({ timeout: 10000 });
    await expect(threeSpeak).toBeAttached({ timeout: 10000 });
    await expect(twitter).toBeAttached({ timeout: 10000 });
    await expect(instagram).toBeAttached({ timeout: 10000 });
  });
});

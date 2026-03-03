import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';

/**
 * Visual regression tests for post content rendering.
 *
 * Uses screenshot comparison to detect layout regressions
 * (e.g. two-column text layout, image placement, etc.).
 */

test.describe('Post rendering visual regression', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('two-column post renders correctly: the-waiting-is-over', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Visual test runs on chromium only');
    test.skip(browserName === 'firefox', 'Visual test runs on chromium only');

    await postPage.gotoPostPage('hive-148441', 'josehany', 'the-waiting-is-over');
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Wait for images inside the article body to load
    await page.waitForFunction(() => {
      const images = document.querySelectorAll('#articleBody img');
      return Array.from(images).every((img) => (img as HTMLImageElement).complete);
    }, { timeout: 15000 });

    await expect(postPage.articleBody).toHaveScreenshot('two-column-post-body.png', {
      maxDiffPixelRatio: 0.01
    });
  });

  test('two-column post renders correctly: at-my-own-pace', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Visual test runs on chromium only');
    test.skip(browserName === 'firefox', 'Visual test runs on chromium only');

    await postPage.gotoPostPage('hive-148441', 'josehany', 'at-my-own-pace');
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Wait for images inside the article body to load
    await page.waitForFunction(() => {
      const images = document.querySelectorAll('#articleBody img');
      return Array.from(images).every((img) => (img as HTMLImageElement).complete);
    }, { timeout: 15000 });

    await expect(postPage.articleBody).toHaveScreenshot('two-column-at-my-own-pace.png', {
      maxDiffPixelRatio: 0.01
    });
  });
});

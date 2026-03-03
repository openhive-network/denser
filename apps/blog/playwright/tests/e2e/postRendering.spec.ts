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

  test('two-column post renders correctly: my-tour-of-the-eastern-region', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Visual test runs on chromium only');
    test.skip(browserName === 'firefox', 'Visual test runs on chromium only');

    await postPage.gotoPostPage(
      'hive-163772',
      'belkyscabrera',
      'my-tour-of-the-eastern-region-visiting-its-beautiful-beaches-and-mountain-area-eng-esp-8gd'
    );
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Wait for images inside the article body to load
    await page.waitForFunction(() => {
      const images = document.querySelectorAll('#articleBody img');
      return Array.from(images).every((img) => (img as HTMLImageElement).complete);
    }, { timeout: 15000 });

    await expect(postPage.articleBody).toHaveScreenshot('two-column-my-tour-of-the-eastern-region.png', {
      maxDiffPixelRatio: 0.01
    });
  });
});

test.describe('Post content order regression', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('witness update post content renders in correct order', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Visual test runs on chromium only');
    test.skip(browserName === 'firefox', 'Visual test runs on chromium only');

    await postPage.gotoPostPage('hive-139531', 'mahdiyari', 'witness-update-public-nodes-update');
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForLoadState('networkidle');

    await expect(postPage.articleBody).toHaveScreenshot('witness-update-public-nodes.png', {
      maxDiffPixelRatio: 0.01
    });
  });
});

test.describe('Post content link styles and navigation', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
    await postPage.gotoPostPage('hive-151327', 'miprimerconcurso', 'sw043i');
    await expect(postPage.articleBody).toBeVisible();
  });

  test('user mention link in post content is red', async ({ page }) => {
    const userLink = page.locator('#articleBody a[href*="/@sketch.and.jam"]');
    await expect(userLink).toBeVisible();

    const color = await postPage.getElementCssPropertyValue(userLink, 'color');
    expect(color).toBe('rgb(195, 34, 34)');
  });

  test('clicking user mention link navigates to profile page', async ({ page }) => {
    const userLink = page.locator('#articleBody a[href*="/@sketch.and.jam"]');
    await expect(userLink).toBeVisible();

    await userLink.click();
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/@sketch.and.jam/);
  });
});

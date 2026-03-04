import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { LoginForm } from '../support/pages/loginForm';
import { HomePage } from '../support/pages/homePage';

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
    test.skip(browserName === 'webkit', 'Visual test runs on chromium only');
    test.skip(browserName === 'firefox', 'Visual test runs on chromium only');

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Table exists inside article body
    const table = page.locator('#articleBody table');
    await expect(table).toBeAttached();

    // Total twitter wrappers in article: 4 (1 standalone + 3 in table)
    const allTwitterWrappers = page.locator('#articleBody .twitterWrapper');
    await expect(allTwitterWrappers).toHaveCount(4);

    // Table contains exactly 3 Twitter embeds
    const tableTwitterWrappers = table.locator('.twitterWrapper');
    await expect(tableTwitterWrappers).toHaveCount(3);

    // Table contains exactly 3 Instagram embeds
    const tableInstagramWrappers = table.locator('.instagramWrapper');
    await expect(tableInstagramWrappers).toHaveCount(3);

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
  });

  test('table with embeds renders correct layout', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Visual test runs on chromium only');
    test.skip(browserName === 'firefox', 'Visual test runs on chromium only');

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Wait for TwitterResizePlugin to settle (LOAD_TIMEOUT_MS = 10s + buffer)
    await page.waitForTimeout(15000);

    // Mask all iframes to avoid flakiness from external embed content
    const iframes = await page.locator('#articleBody iframe').all();

    await expect(postPage.articleBody).toHaveScreenshot('embed-table-layout.png', {
      mask: iframes,
      maxDiffPixelRatio: 0.01
    });
  });
});

test.describe('Editor preview - text before link order', () => {
  test('text before a markdown link is not moved to the end of preview', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Visual test runs on chromium only');
    test.skip(browserName === 'firefox', 'Visual test runs on chromium only');

    const homePage = new HomePage(page);
    const loginForm = new LoginForm(page);
    const postEditorPage = new PostEditorPage(page);
    const postPage = new PostPage(page);

    // Navigate to homepage
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click pencil icon to open login dialog (visible even before full hydration)
    await expect(homePage.getNavCreatePost).toBeVisible({ timeout: 30000 });
    await homePage.getNavCreatePost.click();

    // Fill login form via safe storage
    await loginForm.validateDefaultLoginFormIsLoaded();
    await loginForm.usernameInput.fill(process.env.CI_TEST_USER!);
    await loginForm.passwordInput.fill('testtest');
    await loginForm.wifInput.fill(process.env.CI_TEST_USER_WIF_POSTING!);
    await loginForm.saveSignInButton.click();

    // Wait for login to complete and editor to load (pencil redirects to /submit.html)
    await expect(postEditorPage.getPostTitleInput).toBeVisible({ timeout: 30000 });

    // Type markdown with text before a link
    const markdownContent =
      '### A... Collection of Hive Development Contributions\n' +
      'At the 5-year anniversary of Hive, @thebeedevs published a ' +
      '[list of their contributions](https://peakd.com/hive-139531/@thebeedevs/hive-is-five) ' +
      'to important projects for Hive. Among them, hAIve - the new ' +
      'AI-powered search engine they worked on, which you can test on a development ' +
      'version of Hive.blog they made public. Sadly, when I looked for ' +
      '"adrian\'s lenses" or anything related (found in titles, bodies, and tags of ' +
      'these and other posts), I didn\'t find any post of mine.';

    await postEditorPage.getEditorContentTextarea.fill(markdownContent);
    await expect(postPage.articleBody).toBeVisible();

    // Verify text order in preview: "At the 5-year" must appear BEFORE "list of their contributions"
    const previewText = await postPage.articleBody.textContent();
    const textBeforeLink = previewText!.indexOf('At the 5-year anniversary');
    const linkText = previewText!.indexOf('list of their contributions');

    expect(textBeforeLink, 'Text before link should exist in preview').toBeGreaterThanOrEqual(0);
    expect(linkText, 'Link text should exist in preview').toBeGreaterThanOrEqual(0);
    expect(
      textBeforeLink,
      'Text before a link must appear before the link text in preview'
    ).toBeLessThan(linkText);
  });
});

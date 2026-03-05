import { expect, test, Page } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { LoginForm } from '../support/pages/loginForm';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';

/**
 * Visual regression tests for post content rendering.
 *
 * Uses screenshot comparison to detect layout regressions
 * (e.g. two-column text layout, image placement, etc.).
 */

function chromiumOnly(browserName: string) {
  test.skip(browserName !== 'chromium', 'Visual test runs on chromium only');
}

async function loginAndOpenEditor(page: Page) {
  const homePage = new HomePage(page);
  const loginForm = new LoginForm(page);
  const postEditorPage = new PostEditorPage(page);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(homePage.getNavCreatePost).toBeVisible({ timeout: 30000 });
  await homePage.getNavCreatePost.click();
  await loginForm.validateDefaultLoginFormIsLoaded();
  await loginForm.usernameInput.fill(process.env.CI_TEST_USER!);
  await loginForm.passwordInput.fill('testtest');
  await loginForm.wifInput.fill(process.env.CI_TEST_USER_WIF_POSTING!);
  await loginForm.saveSignInButton.click();
  await expect(postEditorPage.getPostTitleInput).toBeVisible({ timeout: 30000 });

  return { homePage, loginForm, postEditorPage };
}

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

test.describe('Post content order regression', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('witness update post content renders in correct order', async ({ page, browserName }) => {
    chromiumOnly(browserName);

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
  let userLink;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
    await postPage.gotoPostPage('hive-151327', 'miprimerconcurso', 'sw043i');
    await expect(postPage.articleBody).toBeVisible();
    userLink = postPage.getUserMentionLink('sketch.and.jam');
  });

  test('user mention link in post content is red', async () => {
    await expect(userLink).toBeVisible();

    const color = await postPage.getElementCssPropertyValue(userLink, 'color');
    expect(color).toBe('rgb(195, 34, 34)');
  });

  test('clicking user mention link navigates to profile page', async ({ page }) => {
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
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForLoadState('networkidle');

    await expect(postPage.articleTable).toBeAttached();

    // Total twitter wrappers in article: 4 (1 standalone + 3 in table)
    await expect(postPage.twitterWrappers).toHaveCount(4);

    // Table contains exactly 3 Twitter embeds
    const tableTwitterWrappers = postPage.getTwitterWrappersIn(postPage.articleTable);
    await expect(tableTwitterWrappers).toHaveCount(3);

    // Table contains exactly 3 Instagram embeds
    const tableInstagramWrappers = postPage.getInstagramWrappersIn(postPage.articleTable);
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
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Wait for TwitterResizePlugin to settle (LOAD_TIMEOUT_MS = 10s + buffer)
    await page.waitForTimeout(TIMEOUTS.TWITTER_PLUGIN_SETTLE);

    // Mask all iframes to avoid flakiness from external embed content
    const iframes = await postPage.articleIframes.all();

    await expect(postPage.articleBody).toHaveScreenshot('embed-table-layout.png', {
      mask: iframes,
      maxDiffPixelRatio: 0.01
    });
  });
});

test.describe('Cross-post rendering regression', () => {
  const crossPost = {
    community: 'hive-155530',
    author: 'littlebee4',
    permlink:
      'it-is-still-winter-wonderland-in-april--come-explore-with-me-an-icy-lake-at-kamsjon-vasterbotten--sweden-hive-155530'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('cross-post banner with original post link is visible above the content', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(crossPost.community, crossPost.author, crossPost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    // Cross-post info block should be visible with styled background
    const banner = page.locator('div.bg-background-secondary').filter({ hasText: 'cross-posted' });
    await expect(banner).toBeVisible();

    // "this post" link to the original post should be present
    const thisPostLink = banner.getByRole('link', { name: 'this post' });
    await expect(thisPostLink).toBeVisible();

    const href = await thisPostLink.getAttribute('href');
    expect(href).toMatch(/^\/@.+\/.+/);
  });

  test('clicking "this post" link in cross-post banner navigates to the original post', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(crossPost.community, crossPost.author, crossPost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const banner = page.locator('div.bg-background-secondary').filter({ hasText: 'cross-posted' });
    const thisPostLink = banner.getByRole('link', { name: 'this post' });
    const targetHref = await thisPostLink.getAttribute('href');

    await thisPostLink.click();
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain(targetHref!);
  });

  test('"Browse to the original post" link navigates to the original post', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(crossPost.community, crossPost.author, crossPost.permlink);
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForLoadState('networkidle');

    const browseLink = page.locator('a').filter({ hasText: /Browse to the original post by @/ });
    await expect(browseLink).toBeVisible();

    const targetHref = await browseLink.getAttribute('href');
    expect(targetHref).toMatch(/^\/@.+\/.+/);

    await browseLink.click();
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain(targetHref!);
  });
});

test.describe('Paragraph overlap regression', () => {
  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('paragraphs in post body do not overlap each other', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(
      'hive-163772',
      'patsitivity',
      'let-her-in-or-pusan-point-caraga-davao-oriental'
    );
    await expect(postPage.articleBody).toBeVisible();
    await page.waitForLoadState('networkidle');

    const paragraphs = postPage.articleBody.locator('p');
    const count = await paragraphs.count();
    expect(count, 'Post should contain multiple paragraphs').toBeGreaterThan(1);

    // Collect bounding boxes of all visible paragraphs
    const boxes: { index: number; left: number; right: number; top: number; bottom: number; height: number }[] =
      [];
    for (let i = 0; i < count; i++) {
      const p = paragraphs.nth(i);
      if (!(await p.isVisible())) continue;

      const box = await p.boundingBox();
      if (!box) continue;

      boxes.push({
        index: i,
        left: box.x,
        right: box.x + box.width,
        top: box.y,
        bottom: box.y + box.height,
        height: box.height
      });
    }

    expect(boxes.length, 'At least 2 visible paragraphs required').toBeGreaterThan(1);

    // Every paragraph should have non-zero height
    for (const box of boxes) {
      expect(box.height, `Paragraph ${box.index} should have non-zero height`).toBeGreaterThan(0);
    }

    // No two paragraphs should overlap in both axes.
    // Float layouts legitimately place elements side-by-side, so only flag
    // cases where bounding boxes intersect both horizontally AND vertically.
    // 10px tolerance accounts for CSS margin/padding box model interactions;
    // real text-on-text overlap (the original bug) is typically 20px+.
    const TOLERANCE_PX = 10;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i];
        const b = boxes[j];
        const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

        if (overlapX <= TOLERANCE_PX) continue; // side-by-side, no real overlap

        expect(
          overlapY,
          `Paragraphs ${a.index} and ${b.index} overlap by ${overlapY.toFixed(1)}px vertically`
        ).toBeLessThanOrEqual(TOLERANCE_PX);
      }
    }
  });
});

test.describe('Editor preview - text before link order', () => {
  test('text before a markdown link is not moved to the end of preview', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    const { postEditorPage } = await loginAndOpenEditor(page);
    const postPage = new PostPage(page);

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
    expect(previewText).not.toBeNull();
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

test.describe('Image caption rendering regression (issue #620)', () => {
  const captionPost = {
    community: 'test',
    author: 'guest4test1',
    permlink: 'test-ufo'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('sup caption after image renders below the image, not overlapping it', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(captionPost.community, captionPost.author, captionPost.permlink);
    await expect(postPage.articleBody).toBeVisible();
    await postPage.waitForArticleImages();

    const images = postPage.articleBody.locator('img');
    const captions = postPage.articleBody.locator('sup');

    const imageCount = await images.count();
    const captionCount = await captions.count();

    expect(imageCount, 'Post should contain images').toBeGreaterThanOrEqual(2);
    expect(captionCount, 'Post should contain sup captions').toBeGreaterThanOrEqual(2);

    // Each caption must start below its preceding image (no vertical overlap)
    for (let i = 0; i < Math.min(imageCount, captionCount); i++) {
      const imgBox = await images.nth(i).boundingBox();
      const capBox = await captions.nth(i).boundingBox();

      expect(imgBox, `Image ${i} should have a bounding box`).not.toBeNull();
      expect(capBox, `Caption ${i} should have a bounding box`).not.toBeNull();

      // Caption top should be at or below the image bottom (with small tolerance)
      const TOLERANCE_PX = 5;
      expect(
        capBox!.y,
        `Caption ${i} (top: ${capBox!.y.toFixed(1)}px) should start at or below image ${i} bottom (${(imgBox!.y + imgBox!.height).toFixed(1)}px)`
      ).toBeGreaterThanOrEqual(imgBox!.y + imgBox!.height - TOLERANCE_PX);
    }
  });

  test('sup caption text content matches expected captions', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(captionPost.community, captionPost.author, captionPost.permlink);
    await expect(postPage.articleBody).toBeVisible();

    const captions = postPage.articleBody.locator('sup');
    const captionCount = await captions.count();
    expect(captionCount, 'Post should have at least 2 captions').toBeGreaterThanOrEqual(2);

    // Both captions should contain recognizable caption text
    for (let i = 0; i < captionCount; i++) {
      const text = await captions.nth(i).textContent();
      expect(text, `Caption ${i} should not be empty`).toBeTruthy();
      expect(text!.length, `Caption ${i} should have meaningful text`).toBeGreaterThan(5);
    }
  });

  test('image caption layout visual regression', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(captionPost.community, captionPost.author, captionPost.permlink);
    await expect(postPage.articleBody).toBeVisible();
    await postPage.waitForArticleImages();

    await expect(postPage.articleBody).toHaveScreenshot('image-caption-layout.png', {
      maxDiffPixelRatio: 0.01
    });
  });
});

test.describe('Comment rendering with float layout regression (issue #616)', () => {
  const fixturePost = {
    community: 'keychain',
    author: 'keychain',
    permlink: 'hive-keychain-v38--mobile-v25--domains-blacklist-hive-uri-support-and-widgets-revamp'
  };

  const floatCommentAuthor = 'keys-defender';

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('comment footer renders below float content, not overlapping it', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.commentListItems.first()).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });

    // Find the comment list item containing the keys-defender comment
    const commentItem = postPage.commentListItems.filter({
      has: page.locator(`[data-testid="author-name-link"] :text("${floatCommentAuthor}")`)
    });
    await expect(commentItem, 'keys-defender comment should exist').toHaveCount(1);

    const commentContent = commentItem.locator('[data-testid="comment-card-description"]');
    const commentFooter = commentItem.locator('[data-testid="comment-card-footer"]');

    await expect(commentContent).toBeVisible();
    await expect(commentFooter).toBeVisible();

    const contentBox = await commentContent.boundingBox();
    const footerBox = await commentFooter.boundingBox();

    expect(contentBox, 'Comment content should have a bounding box').not.toBeNull();
    expect(footerBox, 'Comment footer should have a bounding box').not.toBeNull();

    // Footer must start at or below the content bottom (floats must be cleared)
    const TOLERANCE_PX = 5;
    expect(
      footerBox!.y,
      `Comment footer (top: ${footerBox!.y.toFixed(1)}px) should be below content bottom (${(contentBox!.y + contentBox!.height).toFixed(1)}px) — float layout must be cleared`
    ).toBeGreaterThanOrEqual(contentBox!.y + contentBox!.height - TOLERANCE_PX);
  });

  test('comment with pull-left/pull-right renders both content sections', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(fixturePost.community, fixturePost.author, fixturePost.permlink);
    await expect(postPage.commentListItems.first()).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });

    const commentItem = postPage.commentListItems.filter({
      has: page.locator(`[data-testid="author-name-link"] :text("${floatCommentAuthor}")`)
    });

    const commentContent = commentItem.locator('[data-testid="comment-card-description"]');

    // The pull-left section contains the commands list
    const commandsText = commentContent.getByText('All commands for @keys-defender');
    await expect(commandsText, 'Pull-left commands section should be visible').toBeVisible();

    // The pull-right section contains the articles/links
    const articlesText = commentContent.getByText('Articles:');
    await expect(articlesText, 'Pull-right articles section should be visible').toBeVisible();

    // &nbsp; should render as whitespace, not as literal text
    const literalNbsp = commentContent.getByText('&nbsp;');
    await expect(
      literalNbsp,
      '&nbsp; should not render as literal text'
    ).toHaveCount(0);
  });
});

test.describe('Editor preview - collapsible sections', () => {
  test('collapsible details section renders and toggles in preview', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    const { postEditorPage } = await loginAndOpenEditor(page);
    const postPage = new PostPage(page);

    const markdownContent = [
      '<details>',
      '<summary>Click to expand</summary>',
      '',
      'These details remain hidden until expanded.',
      '',
      '</details>'
    ].join('\n');

    await postEditorPage.getEditorContentTextarea.fill(markdownContent);
    await expect(postPage.articleBody).toBeVisible();

    const details = postPage.articleBody.locator('details');
    const summary = details.locator('summary');
    const content = details.getByText('These details remain hidden until expanded.');

    await expect(details).toBeAttached();
    await expect(summary).toHaveText('Click to expand');

    // Content should be hidden when collapsed (native <details> behavior)
    await expect(content).not.toBeVisible();

    // Click summary to expand
    await summary.click();
    await expect(content).toBeVisible();

    // Click summary again to collapse
    await summary.click();
    await expect(content).not.toBeVisible();
  });

  test('spoiler syntax renders as collapsible with custom title', async ({ page, browserName }) => {
    chromiumOnly(browserName);

    const { postEditorPage } = await loginAndOpenEditor(page);
    const postPage = new PostPage(page);

    const markdownContent = '>! [Hidden Spoiler Text] This is the spoiler content.';

    await postEditorPage.getEditorContentTextarea.fill(markdownContent);
    await expect(postPage.articleBody).toBeVisible();

    const details = postPage.articleBody.locator('details');
    const summary = details.locator('summary');
    const content = details.getByText('This is the spoiler content.');

    await expect(details).toBeAttached();
    await expect(summary).toContainText('Hidden Spoiler Text');

    // Content should be hidden when collapsed
    await expect(content).not.toBeVisible();

    // Click summary to expand
    await summary.click();
    await expect(content).toBeVisible();
  });
});

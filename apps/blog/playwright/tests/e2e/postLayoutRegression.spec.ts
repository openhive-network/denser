import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';
import { chromiumOnly, assertDefined } from '../support/testHelpers';

/**
 * Layout regression tests: paragraph overlap, float clearing,
 * caption positioning relative to images.
 */

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

    // Select only top-level paragraphs that are NOT inside float containers
    // (pull-left/pull-right divs cause legitimate bounding-box overlap)
    const paragraphs = postPage.articleBody.locator(
      'p:not(.pull-left p):not(.pull-right p):not(.pull-left + p):not(.pull-right + p)'
    );
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

    // Every paragraph should have non-zero height and proper margin-bottom spacing
    for (const box of boxes) {
      expect(box.height, `Paragraph ${box.index} should have non-zero height`).toBeGreaterThan(0);
    }

    // Verify paragraphs have margin-bottom for proper spacing between elements
    const firstVisibleParagraph = paragraphs.first();
    const marginBottom = await firstVisibleParagraph.evaluate((el) => getComputedStyle(el).marginBottom);
    expect(
      parseFloat(marginBottom),
      'Paragraphs should have non-zero margin-bottom for spacing'
    ).toBeGreaterThan(0);

    // No two consecutive paragraphs should overlap vertically.
    // Only check adjacent pairs — non-adjacent paragraphs may share vertical
    // space due to float content between them (e.g. pull-left/pull-right images).
    // 10px tolerance accounts for CSS margin/padding box model interactions;
    // real text-on-text overlap (the original bug) is typically 20px+.
    const TOLERANCE_PX = 10;
    for (let i = 0; i < boxes.length - 1; i++) {
      const a = boxes[i];
      const b = boxes[i + 1];
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

      if (overlapX <= TOLERANCE_PX) continue; // side-by-side, no real overlap

      expect(
        overlapY,
        `Paragraphs ${a.index} and ${b.index} overlap by ${overlapY.toFixed(1)}px vertically`
      ).toBeLessThanOrEqual(TOLERANCE_PX);
    }
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

      assertDefined(imgBox, `Image ${i} should have a bounding box`);
      assertDefined(capBox, `Caption ${i} should have a bounding box`);

      // Caption top should be at or below the image bottom (with small tolerance)
      const TOLERANCE_PX = 5;
      expect(
        capBox.y,
        `Caption ${i} (top: ${capBox.y.toFixed(1)}px) should start at or below image ${i} bottom (${(imgBox.y + imgBox.height).toFixed(1)}px)`
      ).toBeGreaterThanOrEqual(imgBox.y + imgBox.height - TOLERANCE_PX);
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
      assertDefined(text, `Caption ${i} should have text`);
      expect(text.length, `Caption ${i} should have meaningful text`).toBeGreaterThan(5);
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
  // Navigate directly to the single-comment view to avoid ambiguity
  // with multiple keys-defender comments in the discussion thread.
  const floatComment = {
    community: 'keychain',
    author: 'keys-defender',
    permlink: 'info-link-report-reply-1743402627936'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('comment footer renders below float content, not overlapping it', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(floatComment.community, floatComment.author, floatComment.permlink);
    await expect(postPage.articleBody).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });

    // In single-comment view, #articleBody is the main comment content
    const commentContent = postPage.articleBody;
    const commentFooter = page.locator('[data-testid="author-data-post-footer"]');

    await expect(commentFooter).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });

    // Scroll footer into view to ensure boundingBox() returns non-null
    await commentFooter.scrollIntoViewIfNeeded();

    const contentBox = await commentContent.boundingBox();
    const footerBox = await commentFooter.boundingBox();

    assertDefined(contentBox, 'Comment content should have a bounding box');
    assertDefined(footerBox, 'Comment footer should have a bounding box');

    // Footer must start at or below the content bottom (floats must be cleared)
    const TOLERANCE_PX = 5;
    expect(
      footerBox.y,
      `Comment footer (top: ${footerBox.y.toFixed(1)}px) should be below content bottom (${(contentBox.y + contentBox.height).toFixed(1)}px) — float layout must be cleared`
    ).toBeGreaterThanOrEqual(contentBox.y + contentBox.height - TOLERANCE_PX);
  });

  test('comment with pull-left/pull-right renders both content sections', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(floatComment.community, floatComment.author, floatComment.permlink);
    await expect(postPage.articleBody).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });

    // The renderer wraps adjacent pull-left + pull-right in a .pull-columns flex container,
    // which overrides float to 'none' and uses flexbox instead. Verify the actual layout:
    const pullColumns = postPage.articleBody.locator('.pull-columns').first();
    const pullLeft = pullColumns.locator('.pull-left').first();
    const pullRight = pullColumns.locator('.pull-right').first();

    // Verify flex container layout
    await expect(pullColumns).toHaveCSS('display', 'flex');
    await expect(pullLeft).toHaveCSS('flex', '1 1 0%');
    await expect(pullRight).toHaveCSS('flex', '1 1 0%');

    // Verify both sections are side-by-side (same Y position, different X)
    const leftBox = await pullLeft.boundingBox();
    const rightBox = await pullRight.boundingBox();
    assertDefined(leftBox, 'pull-left should have a bounding box');
    assertDefined(rightBox, 'pull-right should have a bounding box');
    expect(
      Math.abs(leftBox.y - rightBox.y),
      'Pull-left and pull-right should be on the same horizontal line'
    ).toBeLessThan(5);
    expect(
      leftBox.x,
      'Pull-left and pull-right should not overlap horizontally'
    ).not.toEqual(rightBox.x);

    // The pull-left section contains the commands list
    const commandsText = postPage.articleBody.getByText('All commands for @keys-defender');
    await expect(commandsText, 'Pull-left commands section should be visible').toBeVisible();

    // The pull-right section contains the articles/links
    const articlesText = postPage.articleBody.getByText('Articles:');
    await expect(articlesText, 'Pull-right articles section should be visible').toBeVisible();

    // &nbsp; should render as whitespace, not as literal text
    const literalNbsp = postPage.articleBody.getByText('&nbsp;');
    await expect(
      literalNbsp,
      '&nbsp; should not render as literal text'
    ).toHaveCount(0);
  });
});

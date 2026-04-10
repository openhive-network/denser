import { expect, test } from '@playwright/test';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';
import { chromiumOnly, assertDefined } from '../support/testHelpers';

/**
 * Tests for interactive elements in posts: link navigation,
 * image clicks inside external links, cross-post banner.
 */

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
    await postPage.validateUserMentionLink('sketch.and.jam');
  });

  test('clicking user mention link navigates to profile page', async ({ page }) => {
    await expect(userLink).toBeVisible();

    await userLink.click();
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/@sketch.and.jam/);
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
    assertDefined(targetHref, 'Cross-post link should have an href');

    await thisPostLink.click();
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain(targetHref);
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
    assertDefined(targetHref, 'Browse link should have an href');

    await browseLink.click();
    await page.waitForLoadState('domcontentloaded');

    expect(page.url()).toContain(targetHref);
  });
});

test.describe('Clicking image inside external link in comment regression (issue #562)', () => {
  // Worldmappin comment with an image wrapped in an external link:
  // <a href="https://engage.hivechain.app">![](https://i.imgur.com/XsrNmcl.png)</a>
  // Bug: clicking the image crashed the page because e.target was <img> (no href),
  // not the parent <a>. The fix traverses to the parent element to get the href.
  const worldmappinComment = {
    community: 'hive-163772',
    author: 'worldmappin',
    permlink: 're-1736330799406'
  };

  let postPage: PostPage;

  test.beforeEach(async ({ page }) => {
    postPage = new PostPage(page);
  });

  test('clicking image inside external link opens leave-page dialog instead of crashing', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(
      worldmappinComment.community,
      worldmappinComment.author,
      worldmappinComment.permlink
    );
    await expect(postPage.articleBody).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });

    // Find the image inside the external link in the comment body
    const externalLink = postPage.articleBody.locator('a.link-external');
    await expect(externalLink, 'External link should exist in the comment').toHaveCount(1);

    const imageInLink = externalLink.locator('img');
    await expect(imageInLink, 'Image inside external link should be visible').toBeVisible();

    // Click the image (not the link itself) — this was the original crash trigger
    await imageInLink.click();

    // The leave-page dialog should appear instead of a page error
    const leaveDialog = page.getByText('You are about to leave this app.');
    await expect(leaveDialog, 'Leave-page dialog should open after clicking image link').toBeVisible();

    // Dialog should display the target URL
    const targetUrl = page.getByText('engage.hivechain.app');
    await expect(targetUrl, 'Dialog should show the external URL').toBeVisible();
  });

  test('page does not show error after clicking image in external link', async ({
    page,
    browserName
  }) => {
    chromiumOnly(browserName);

    await postPage.gotoPostPage(
      worldmappinComment.community,
      worldmappinComment.author,
      worldmappinComment.permlink
    );
    await expect(postPage.articleBody).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });

    const imageInLink = postPage.articleBody.locator('a.link-external img');
    await expect(imageInLink).toBeVisible();

    await imageInLink.click();

    // The page should NOT show an error — verify no error boundary is rendered
    const errorText = page.getByText('Application error');
    await expect(errorText).toHaveCount(0);

    // The article body should still be visible behind the dialog
    await expect(postPage.articleBody).toBeVisible();
  });
});

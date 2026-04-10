import { expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';
import { PostPage } from '../../support/pages/postPage';
import { ProfilePage } from '../../support/pages/profilePage';
import { PAGINATION, TIMEOUTS } from '../../support/constants';

test.describe('Homepage tests', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    profilePage = new ProfilePage(page);
  });

  test('HP-01: Homepage loads with 20 posts by default', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Default feed should load exactly 20 posts
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBe(PAGINATION.INITIAL_POSTS_COUNT);
  });

  test('HP-02: Post card contains all required data', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Structure: avatar, author with reputation, title, timestamp, community/category
    await expect(homePage.getFirstPostCardAvatar).toBeVisible();
    await expect(homePage.getFirstPostAuthor).toBeVisible();
    await expect(homePage.getFirstPostAuthorReputation).toBeVisible();
    await expect(homePage.getFirstPostTitle).toBeVisible();
    await expect(homePage.getFirstPostCardTimestampLink).toBeVisible();

    // Post should belong to a community or category
    const hasCommunity = await homePage.getFirstPostCardCommunityLink.isVisible();
    const hasCategory = await homePage.getFirstPostCardCategoryLink.isVisible();
    expect(hasCommunity || hasCategory).toBe(true);

    // Footer: upvote, downvote, payout, votes, comments count
    await expect(homePage.getFirstPostUpvoteButton).toBeVisible();
    await expect(homePage.getFirstPostDownvoteButton).toBeVisible();
    await expect(homePage.getFirstPostPayout).toBeVisible();
    await expect(homePage.getFirstPostVotes).toBeVisible();
    await expect(homePage.getFirstPostChildren).toBeVisible();

    // Payout should have a dollar value format
    const payoutText = await homePage.getFirstPostPayout.textContent();
    expect(payoutText).toMatch(/\$\d+/);

    // Author should be a non-empty username
    const authorText = await homePage.getFirstPostAuthor.textContent();
    expect(authorText?.trim()).toMatch(/\w+/);

    // Timestamp should contain "ago" or a date-like string
    const timestampText = await homePage.getFirstPostCardTimestampLink.textContent();
    expect(timestampText?.trim().length).toBeGreaterThan(0);
  });

  test('HP-03: Infinite scroll loads more posts', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts).toHaveCount(PAGINATION.INITIAL_POSTS_COUNT, {
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Scroll to bottom to trigger infinite scroll
    await page.keyboard.press('End');

    await page.waitForFunction(
      (minPosts) => document.querySelectorAll('[data-testid="post-list-item"]').length >= minPosts,
      PAGINATION.MIN_POSTS_AFTER_SCROLL,
      { timeout: TIMEOUTS.HYDRATION }
    );

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThanOrEqual(PAGINATION.MIN_POSTS_AFTER_SCROLL);

    // New posts should have different titles than first post
    const firstTitle = await homePage.getFirstPostTitle.textContent();
    const lastPostTitle = await homePage.getMainTimeLineOfPosts
      .last()
      .locator('h3 a')
      .textContent();
    expect(lastPostTitle).not.toBe(firstTitle);
  });

  test('HP-04: Clicking post title opens full post with matching content', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getFirstPostTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Capture data from feed card
    const feedTitle = await homePage.getFirstPostTitle.textContent();
    const feedAuthor = (await homePage.getFirstPostAuthor.textContent())?.trim();

    await homePage.getFirstPostTitle.click();

    // Post page should show same title and author
    await expect(postPage.articleTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(postPage.articleTitle).toHaveText(feedTitle ?? '');
    await expect(postPage.articleAuthorName).toContainText(feedAuthor?.replace('@', '') ?? '');

    // Post body should have actual content
    await expect(postPage.articleBody).toBeVisible();
    const bodyText = await postPage.articleBody.textContent();
    expect(bodyText?.trim().length).toBeGreaterThan(0);
  });

  test('HP-05: Clicking author navigates to their profile with stats', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getFirstPostAuthor).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    const authorName = (await homePage.getFirstPostAuthor.textContent())?.trim().replace('@', '');
    await homePage.getFirstPostAuthor.click();

    // Profile should load with name and stats
    await expect(page).toHaveURL(new RegExp(`/@${authorName}`));
    await expect(profilePage.profileName).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Stats should be present: followers, posts, following
    await expect(profilePage.profileFollowers).toBeVisible();
    await expect(profilePage.profileNumberOfPosts).toBeVisible();
    await expect(profilePage.profileFollowing).toBeVisible();
  });

  test('HP-06: Sidebar has trending communities with working links', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();

    // Should have multiple community links
    const communityLinks = homePage.getTrendingCommunitiesSideBarLinks;
    const count = await communityLinks.count();
    expect(count).toBeGreaterThan(3);

    // Each community link should have text (name) and href
    const firstLinkText = await communityLinks.first().textContent();
    expect(firstLinkText?.trim().length).toBeGreaterThan(0);

    const firstLinkHref = await communityLinks.first().getAttribute('href');
    expect(firstLinkHref).toMatch(/\/(trending|hot|created)\//);

    // Clicking community navigates to community feed
    await communityLinks.first().click();
    await expect(page).toHaveURL(/\/(trending|hot|created)\//);
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });
  });

  test('HP-07: Explore communities link navigates to communities page', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getExploreCommunities).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(homePage.getExploreCommunities).toHaveText(/Explore communities/);

    await homePage.getExploreCommunities.click();

    await expect(page).toHaveURL('/communities');
  });

  test('HP-08: Theme toggle switches between light and dark', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Verify default is light mode
    await expect(page.locator('html')).not.toHaveClass(/dark/);

    // Switch to dark mode — verify class changes
    await homePage.changeThemeMode('Dark');
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Posts should still be visible in dark mode
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible();

    // Switch back to light mode
    await homePage.changeThemeMode('Light');
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('HP-09: Clicking community/category on post card navigates to that community', async ({
    page
  }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    const hasCommunity = await homePage.getFirstPostCardCommunityLink.isVisible();
    const hasCategory = await homePage.getFirstPostCardCategoryLink.isVisible();

    if (hasCommunity) {
      await homePage.getFirstPostCardCommunityLink.click();

      await expect(page).toHaveURL(/\/(trending|hot|created)\//);
      await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
        timeout: TIMEOUTS.SEARCH_RESULTS
      });
    } else if (hasCategory) {
      await homePage.getFirstPostCardCategoryLink.click();

      await expect(page).toHaveURL(/\/(trending|hot|created)\//);
      await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
        timeout: TIMEOUTS.SEARCH_RESULTS
      });
    }
  });

  test('HP-10: Upvote button on post card shows login dialog for anonymous user', async ({
    page
  }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getFirstPostUpvoteButton).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    await homePage.getFirstPostUpvoteButton.click();

    // Should show login dialog
    const loginDialog = page.getByTestId('login-dialog');
    const loginFormDesc = page.getByTestId('login-form-description');
    await expect(loginDialog.or(loginFormDesc)).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });
});

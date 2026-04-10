import { expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';
import { PostPage } from '../../support/pages/postPage';
import { ProfilePage } from '../../support/pages/profilePage';
import { LoginForm } from '../../support/pages/loginForm';
import { TIMEOUTS } from '../../support/constants';

test.describe('Profile page tests', () => {
  let homePage: HomePage;
  let postPage: PostPage;
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    postPage = new PostPage(page);
    profilePage = new ProfilePage(page);
  });

  test('PR-01: Profile page shows complete user info and stats', async ({ page }) => {
    await page.goto('/@gtg', { waitUntil: 'domcontentloaded' });

    // Name and about
    await expect(profilePage.profileName).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const profileName = await profilePage.profileName.textContent();
    expect(profileName?.trim().length).toBeGreaterThan(0);

    await expect(profilePage.profileAbout).toBeVisible();
    const aboutText = await profilePage.profileAbout.textContent();
    expect(aboutText?.trim().length).toBeGreaterThan(0);

    // Stats: followers, posts count, following, HP
    await expect(profilePage.profileFollowers).toBeVisible();
    await expect(profilePage.profileNumberOfPosts).toBeVisible();
    await expect(profilePage.profileFollowing).toBeVisible();
    await expect(profilePage.profileHP).toBeVisible();

    // Followers should have numeric content
    const followersText = await profilePage.profileFollowers.textContent();
    expect(followersText).toMatch(/\d+/);

    // Posts count should be numeric
    const postsText = await profilePage.profileNumberOfPosts.textContent();
    expect(postsText).toMatch(/\d+/);
  });

  test('PR-02: Profile tabs navigate correctly and show content', async ({ page }) => {
    await page.goto('/@gtg', { waitUntil: 'domcontentloaded' });

    // Verify navigation tabs exist
    await expect(profilePage.profileBlogLink).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(profilePage.profilePostsLink).toBeVisible();
    await expect(profilePage.profileRepliesLink).toBeVisible();

    // Click Posts tab — should show posts
    await profilePage.profilePostsLink.click();
    await expect(page).toHaveURL(/@gtg\/posts/);
    await expect(profilePage.profileBlogPostsList).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Click Replies tab — should change URL
    await profilePage.profileRepliesLink.click();
    await expect(page).toHaveURL(/@gtg\/replies/);

    // Go back to Blog tab
    await profilePage.profileBlogLink.click();
    await expect(page).toHaveURL(/@gtg$/);
  });

  test('PR-03: Profile posts tab shows post list with author data', async ({ page }) => {
    await page.goto('/@gtg/posts', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/@gtg\/posts/);

    await expect(profilePage.profileBlogPostsList).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Posts should contain the profile author
    const firstPostAuthor = page.locator('[data-testid="post-author"]').first();
    await expect(firstPostAuthor).toBeVisible();
    await expect(firstPostAuthor).toContainText('gtg');
  });

  test('PR-04: Follow button shows login dialog for anonymous user', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await page.goto('/@gtg', { waitUntil: 'domcontentloaded' });

    await expect(profilePage.followButton).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await profilePage.followButton.click();

    await expect(loginForm.loginFormDescription).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(loginForm.loginFormDescription).toHaveText('Save your posting key by filling form below');
  });

  test('PR-05: Navigating to profile from post preserves author identity', async ({ page }) => {
    // Get an author from the feed and navigate to their profile
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getFirstPostAuthor).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    const authorName = (await homePage.getFirstPostAuthor.textContent())?.trim().replace('@', '');
    await homePage.getFirstPostAuthor.click();

    // Profile URL should contain author name
    await expect(page).toHaveURL(new RegExp(`/@${authorName}`));
    await expect(profilePage.profileName).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    // Stats should be present
    await expect(profilePage.profileFollowers).toBeVisible();
    await expect(profilePage.profileFollowing).toBeVisible();
  });
});

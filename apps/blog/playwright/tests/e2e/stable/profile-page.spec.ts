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

  test('PR-01: Profile page loads with user info', async ({ page }) => {
    // Navigate to a profile dynamically from feed (not hardcoded)
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getFirstPostAuthor).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    const authorName = (await homePage.getFirstPostAuthor.textContent())?.trim();
    await homePage.getFirstPostAuthor.click();

    // Verify profile elements are visible
    await expect(profilePage.profileName).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(profilePage.profileInfo).toBeVisible();
    await expect(page).toHaveURL(/@/);
  });

  test('PR-02: Profile tabs are navigable', async ({ page }) => {
    await page.goto('/@gtg', { waitUntil: 'domcontentloaded' });

    // Verify navigation tabs exist and are clickable
    await expect(profilePage.profileBlogLink).toBeVisible();
    await expect(profilePage.profilePostsLink).toBeVisible();
    await expect(profilePage.profileRepliesLink).toBeVisible();

    // Click Posts tab
    await profilePage.profilePostsLink.click();
    await expect(page).toHaveURL(/@gtg\/posts/);

    // Click Replies tab
    await profilePage.profileRepliesLink.click();
    await expect(page).toHaveURL(/@gtg\/replies/);
  });

  test('PR-03: Profile posts tab shows posts', async ({ page }) => {
    await page.goto('/@gtg/posts', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/@gtg\/posts/);

    // Wait for post list to appear
    await expect(profilePage.profileBlogPostsList).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });
  });

  test('PR-04: Follow button shows login dialog', async ({ page }) => {
    const loginForm = new LoginForm(page);

    await page.goto('/@gtg', { waitUntil: 'domcontentloaded' });

    await expect(profilePage.followButton).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await profilePage.followButton.click();

    await expect(loginForm.loginFormDescription).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });
});

import { expect, test } from '@playwright/test';
import { HomePage } from '../../support/pages/homePage';
import { CommunitiesExplorePage } from '../../support/pages/communitiesExplorerPage';
import { CommunitiesPage } from '../../support/pages/communitiesPage';
import { TIMEOUTS } from '../../support/constants';

test.describe('Communities tests', () => {
  let homePage: HomePage;
  let communitiesPage: CommunitiesExplorePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    communitiesPage = new CommunitiesExplorePage(page);
  });

  test('CM-01: Communities explore page loads', async ({ page }) => {
    await page.goto('/communities', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL('/communities');
    await expect(communitiesPage.communityListItem.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    const count = await communitiesPage.communityListItem.count();
    expect(count).toBeGreaterThan(0);
  });

  test('CM-02: Community card has required info', async ({ page }) => {
    await page.goto('/communities', { waitUntil: 'domcontentloaded' });

    await expect(communitiesPage.communityListItem.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // First community card should have title and about text
    await expect(communitiesPage.communityListItemTitle.first()).toBeVisible();
    await expect(communitiesPage.communityListItemTitle.first()).not.toBeEmpty();
    await expect(communitiesPage.communityListItemAbout.first()).toBeVisible();
  });

  test('CM-03: Navigate to community page', async ({ page }) => {
    await page.goto('/communities', { waitUntil: 'domcontentloaded' });

    await expect(communitiesPage.communityListItemTitle.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Click first community
    await communitiesPage.communityListItemTitle.first().click();

    // Should navigate to a community page with posts
    await expect(page).toHaveURL(/\/(trending|hot|created)\//);
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });
  });

  test('CM-04: Subscribe button shows login dialog', async ({ page }) => {
    await page.goto('/communities', { waitUntil: 'domcontentloaded' });

    await expect(communitiesPage.communityListItem.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Click subscribe button on first community
    const subscribeButton = communitiesPage.communityListItemSubscribeButton.first();
    await expect(subscribeButton).toBeVisible();
    await subscribeButton.click();

    // Should show either login form or login-to-vote dialog
    const loginDialog = page.getByTestId('login-dialog');
    const loginFormDesc = page.getByTestId('login-form-description');
    await expect(loginDialog.or(loginFormDesc)).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('CM-05: Community page shows name, info and posts', async ({ page }) => {
    const communityPage = new CommunitiesPage(page);

    // Navigate to a community from explore page
    await page.goto('/communities', { waitUntil: 'domcontentloaded' });

    await expect(communitiesPage.communityListItemTitle.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    await communitiesPage.communityListItemTitle.first().click();

    // Community page should show name and posts
    await expect(communityPage.communityNameTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await expect(communityPage.communityNameTitle).not.toBeEmpty();
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });
  });
});

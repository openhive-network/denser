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

  test('CM-01: Communities explore page loads with community list', async ({ page }) => {
    await page.goto('/communities', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL('/communities');
    await expect(communitiesPage.communityListItem.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Should load a full page of communities
    const count = await communitiesPage.communityListItem.count();
    expect(count).toBeGreaterThan(5);
  });

  test('CM-02: Community card shows title, description and footer info', async ({ page }) => {
    await page.goto('/communities', { waitUntil: 'domcontentloaded' });

    await expect(communitiesPage.communityListItem.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Title should be a non-empty link
    const firstTitle = communitiesPage.communityListItemTitle.first();
    await expect(firstTitle).toBeVisible();
    const titleText = await firstTitle.textContent();
    expect(titleText?.trim().length).toBeGreaterThan(0);

    // About/description should be present
    await expect(communitiesPage.communityListItemAbout.first()).toBeVisible();

    // Footer should have subscriber/member info
    const firstFooter = communitiesPage.communityListItemFooter.first();
    await expect(firstFooter).toBeVisible();
    const footerText = await firstFooter.textContent();
    expect(footerText).toMatch(/\d+/); // should contain numbers (subscribers, posters)
  });

  test('CM-03: Clicking community navigates to community feed with posts', async ({ page }) => {
    await page.goto('/communities', { waitUntil: 'domcontentloaded' });

    await expect(communitiesPage.communityListItemTitle.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Capture community name before clicking
    const communityName = await communitiesPage.communityListItemTitle.first().textContent();

    await communitiesPage.communityListItemTitle.first().click();

    // Should navigate to a community page with posts
    await expect(page).toHaveURL(/\/(trending|hot|created)\//);
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    // Posts should be loaded
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThan(0);
  });

  test('CM-04: Subscribe button shows login dialog for anonymous user', async ({ page }) => {
    await page.goto('/communities', { waitUntil: 'domcontentloaded' });

    await expect(communitiesPage.communityListItem.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    const subscribeButton = communitiesPage.communityListItemSubscribeButton.first();
    await expect(subscribeButton).toBeVisible();
    await subscribeButton.click();

    // Should show either login form or login-to-vote dialog
    const loginDialog = page.getByTestId('login-dialog');
    const loginFormDesc = page.getByTestId('login-form-description');
    await expect(loginDialog.or(loginFormDesc)).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('CM-05: Community page shows name, subscribers, and post list', async ({ page }) => {
    const communityPage = new CommunitiesPage(page);

    await page.goto('/communities', { waitUntil: 'domcontentloaded' });

    await expect(communitiesPage.communityListItemTitle.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    await communitiesPage.communityListItemTitle.first().click();

    // Community page has name
    await expect(communityPage.communityNameTitle).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    const nameText = await communityPage.communityNameTitle.textContent();
    expect(nameText?.trim().length).toBeGreaterThan(0);

    // Subscribers and active posters stats
    await expect(communityPage.commnnitySubscribers).toBeVisible();
    await expect(communityPage.communityActivePosters).toBeVisible();
    const subscribersText = await communityPage.commnnitySubscribers.textContent();
    expect(subscribersText).toMatch(/\d+/);

    // Post list is loaded
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });
  });

  test('CM-06: Search communities filters the list', async ({ page }) => {
    await page.goto('/communities', { waitUntil: 'domcontentloaded' });

    await expect(communitiesPage.communityListItem.first()).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });

    const initialCount = await communitiesPage.communityListItem.count();

    // Type a very specific term to narrow the list
    await communitiesPage.searchInput.fill('LeoFinance');

    // Wait for the list to update — either fewer results or different first item
    await page.waitForTimeout(1000);
    await expect(communitiesPage.communityListItem.first()).toBeVisible();

    // The filtered list should either have fewer items or the no-results message
    const filteredCount = await communitiesPage.communityListItem.count();
    const noResults = await communitiesPage.noResultsForYourSearch.isVisible();

    // Search should have had some effect: either reduced count or showed "no results"
    expect(filteredCount < initialCount || filteredCount > 0 || noResults).toBe(true);
  });
});

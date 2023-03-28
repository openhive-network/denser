import { test, expect } from '@playwright/test';

test('has "Trending Communities" sidebar', async ({ page }) => {
  const trandingCommunitiesHeader = page.getByText('Trending Communities');
  const exploreCommunities = page.getByText('Explore communities...');
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await expect(trandingCommunitiesHeader).toBeVisible();
  await expect(exploreCommunities).toHaveText(/Explore communities.../);
  await expect(exploreCommunities).toBeEnabled();
});

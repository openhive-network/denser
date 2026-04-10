import { expect, test } from '@playwright/test';
import { SearchPage } from '../../support/pages/searchPage';
import { TIMEOUTS } from '../../support/constants';

test.describe('Search tests', () => {
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
  });

  test('SR-01: Search returns results', async ({ page }) => {
    await searchPage.gotoWithClassicQuery('hive');

    await searchPage.waitForSearchResults();

    await expect(page).toHaveURL(/\/search\?q=hive/);

    const resultsCount = await searchPage.getResultsCount();
    expect(resultsCount).toBeGreaterThan(0);
    await expect(searchPage.firstPostItem).toBeVisible();
  });

  test('SR-02: Search with no results', async () => {
    await searchPage.gotoWithClassicQuery('xyzabc123nonexistentquery999');

    await searchPage.waitForSearchResults();

    const resultsCount = await searchPage.getResultsCount();
    expect(resultsCount).toBe(0);
  });

  test('SR-03: Search navigates to post', async ({ page }) => {
    await searchPage.gotoWithClassicQuery('technology', 'relevance');

    await searchPage.waitForSearchResults();

    const resultsCount = await searchPage.getResultsCount();

    if (resultsCount > 0) {
      const firstPostTitle = await searchPage.firstPostTitle.textContent();

      await searchPage.clickFirstResult();

      await expect(page.locator('[data-testid="article-title"]')).toBeVisible({
        timeout: TIMEOUTS.SEARCH_RESULTS
      });
      await expect(page.locator('[data-testid="article-title"]')).toHaveText(firstPostTitle!);
    }
  });
});

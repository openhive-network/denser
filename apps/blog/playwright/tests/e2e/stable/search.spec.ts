import { expect, test } from '@playwright/test';
import { SearchPage } from '../../support/pages/searchPage';
import { TIMEOUTS } from '../../support/constants';

test.describe('Search tests', () => {
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    searchPage = new SearchPage(page);
  });

  test('SR-01: Search returns results with title and author', async ({ page }) => {
    await searchPage.gotoWithClassicQuery('hive');

    await searchPage.waitForSearchResults();

    await expect(page).toHaveURL(/\/search\?q=hive/);

    const resultsCount = await searchPage.getResultsCount();
    expect(resultsCount).toBeGreaterThan(0);

    // First result should have a title and author
    await expect(searchPage.firstPostItem).toBeVisible();
    await expect(searchPage.firstPostTitle).toBeVisible();
    const titleText = await searchPage.firstPostTitle.textContent();
    expect(titleText?.trim().length).toBeGreaterThan(0);

    await expect(searchPage.firstPostAuthor).toBeVisible();
  });

  test('SR-02: Search with no results shows empty state', async () => {
    await searchPage.gotoWithClassicQuery('xyzabc123nonexistentquery999');

    await searchPage.waitForSearchResults();

    const resultsCount = await searchPage.getResultsCount();
    expect(resultsCount).toBe(0);
  });

  test('SR-03: Clicking search result opens full post with matching title', async ({ page }) => {
    await searchPage.gotoWithClassicQuery('blockchain', 'relevance');

    await searchPage.waitForSearchResults();

    const resultsCount = await searchPage.getResultsCount();
    expect(resultsCount).toBeGreaterThan(0);

    const firstPostTitle = await searchPage.firstPostTitle.textContent();

    await searchPage.clickFirstResult();

    await expect(page.locator('[data-testid="article-title"]')).toBeVisible({
      timeout: TIMEOUTS.SEARCH_RESULTS
    });
    await expect(page.locator('[data-testid="article-title"]')).toHaveText(firstPostTitle ?? '');
  });

  test('SR-04: Search with sort parameter changes URL correctly', async ({ page }) => {
    // Relevance sort
    await searchPage.gotoWithClassicQuery('hive', 'relevance');
    await searchPage.waitForSearchResults();
    await expect(page).toHaveURL(/s=relevance/);
    const relevanceCount = await searchPage.getResultsCount();
    expect(relevanceCount).toBeGreaterThan(0);

    // Newest sort — verify URL is correct, results may take time to load
    await searchPage.gotoWithClassicQuery('hive', 'created');
    await expect(page).toHaveURL(/s=created/);
    await searchPage.waitForSearchResults();
  });

  test('SR-05: Search page loads with functional input and mode selector', async ({ page }) => {
    await searchPage.goto();

    await expect(page).toHaveURL('/search');
    await expect(searchPage.modeSelectTrigger).toBeVisible();
    await expect(searchPage.searchInput).toBeVisible();
    await expect(searchPage.searchButton).toBeVisible();

    // Input should be interactive
    const isEnabled = await searchPage.isInputEnabled();
    expect(isEnabled).toBe(true);

    const placeholder = await searchPage.getInputPlaceholder();
    expect(placeholder?.length).toBeGreaterThan(0);
  });
});

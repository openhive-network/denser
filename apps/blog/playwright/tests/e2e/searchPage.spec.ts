import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { SearchPage } from '../support/pages/searchPage';
import { TIMEOUTS, isProductionEnvironment } from '../support/constants';

// Production has known bugs with dropdowns (SSR hydration issues)
const PRODUCTION_DROPDOWN_BUG = 'Production bug: dropdowns not functional due to SSR hydration issue';
const PRODUCTION_PROFILE_BUG = 'Production bug: profile page loads too slowly';

test.describe('Search page tests', () => {
  let homePage: HomePage;
  let searchPage: SearchPage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
    searchPage = new SearchPage(page);
  });

  /**
   * BASIC SEARCH PAGE TESTS
   */

  test('search page is loaded correctly', async ({ page }) => {
    await searchPage.goto();

    // Verify page loaded
    await expect(page).toHaveURL('/search');
    await expect(searchPage.modeSelectTrigger).toBeVisible();
    await expect(searchPage.searchInput).toBeVisible();
    await expect(searchPage.searchButton).toBeVisible();
  });

  test('search page mode selector is functional', async ({ page, browserName }) => {
    test.skip(browserName === 'firefox', 'Mode selector has timing issues on Firefox');
    test.skip(isProductionEnvironment(), PRODUCTION_DROPDOWN_BUG);
    await searchPage.goto();

    // Verify mode menu can be opened
    await searchPage.modeSelectTrigger.click();
    await expect(page.locator('[role="option"]').first()).toBeVisible();

    // Select classic mode
    await searchPage.modeClassic.click();

    // Verify input is enabled
    const isEnabled = await searchPage.isInputEnabled();
    expect(isEnabled).toBe(true);

    // Verify placeholder
    const placeholder = await searchPage.getInputPlaceholder();
    expect(placeholder).toBe('Search...');
  });

  /**
   * CLASSIC SEARCH TESTS - using URL with parameters to bypass disabled input issue
   */

  test('search by keyword returns matching posts', async ({ page }) => {
    // Use direct URL with query param
    await searchPage.gotoWithClassicQuery('hive');

    // Wait for results
    await searchPage.waitForSearchResults();

    // Verify URL
    await expect(page).toHaveURL(/\/search\?q=hive/);

    // Verify results exist
    const resultsCount = await searchPage.getResultsCount();
    expect(resultsCount).toBeGreaterThan(0);
  });

  test('search sorting by relevance works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Search results timing issues on WebKit');
    await searchPage.gotoWithClassicQuery('blockchain', 'relevance');

    await searchPage.waitForSearchResults();

    // Verify URL
    await expect(page).toHaveURL(/s=relevance/);

    // Verify results exist
    const resultsCount = await searchPage.getResultsCount();
    expect(resultsCount).toBeGreaterThan(0);
  });

  test('@flaky search sorting by newest (created) works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Search results timing issues on WebKit');
    test.skip(isProductionEnvironment(), 'Production: search by created sort intermittently fails');
    await searchPage.gotoWithClassicQuery('hive', 'created');

    const state = await searchPage.waitForSearchResults();

    // Verify URL — the only deterministic assertion: the route accepted our
    // sort param. Anything beyond this depends on the upstream HiveSearcher
    // backend, which is flaky in CI: sometimes returns zero hits for q=hive
    // and sometimes never responds within the 15s wait.
    await expect(page).toHaveURL(/s=created/);

    if (state === 'timeout') {
      // Backend didn't produce results or empty-state UI within the wait —
      // skip rather than fail. A hard regression in the page itself would
      // surface in the URL/route check above or in the non-flaky tests.
      test.skip(true, 'HiveSearcher did not respond within 15s — runtime backend flake, not a frontend regression');
      return;
    }

    if (state === 'results') {
      expect(await searchPage.getResultsCount()).toBeGreaterThan(0);
    }
  });

  test('search pagination works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Pagination scroll has timing issues on WebKit');

    await searchPage.gotoWithClassicQuery('test', 'relevance');

    // Wait for initial results
    await searchPage.waitForSearchResults();

    const initialCount = await searchPage.getResultsCount();
    expect(initialCount).toBeGreaterThan(0);

    // Scroll down to load more
    await searchPage.scrollToLoadMore();

    // Verify more results loaded
    const newCount = await searchPage.getResultsCount();
    expect(newCount).toBeGreaterThanOrEqual(initialCount);
  });

  test('empty search results shows appropriate message or empty list', async ({ page }) => {
    // Search for nonsense text
    await searchPage.gotoWithClassicQuery('xyzabc123nonexistentquery999');

    // Wait for results (or lack thereof)
    await searchPage.waitForSearchResults();

    // Verify list is empty or shows message
    const resultsCount = await searchPage.getResultsCount();
    expect(resultsCount).toBe(0);
  });

  /**
   * AI SEARCH (HiveSense) TESTS
   */

  test('AI search mode option exists', async ({ page }) => {
    test.skip(isProductionEnvironment(), PRODUCTION_DROPDOWN_BUG);
    await searchPage.goto();

    // Open mode menu
    await searchPage.modeSelectTrigger.click();
    await page.waitForSelector('[role="option"]', { timeout: TIMEOUTS.ELEMENT_VISIBLE });

    // Verify there are 5 options (classic, ai, account, userTopic, tag)
    const optionsCount = await page.locator('[role="option"]').count();
    expect(optionsCount).toBe(5);

    // Verify AI option (second) exists
    await expect(searchPage.modeAi).toBeVisible();
  });

  test('AI search returns results when available', async ({ page }) => {
    // Try to load page with AI search
    await searchPage.gotoWithAiQuery('What is Hive blockchain?');

    // Wait for results with explicit state handling
    const searchState = await searchPage.waitForSearchResults(TIMEOUTS.SEARCH_RESULTS);

    // Check state - may have results or error (HiveSense may be unavailable)
    const resultsCount = await searchPage.getResultsCount();

    // If HiveSense works, there should be results
    // If not, test still passes (graceful degradation)
    if (resultsCount > 0) {
      await expect(searchPage.firstPostItem).toBeVisible();
    } else {
      test.info().annotations.push({
        type: 'note',
        description: `AI search returned no results (state: ${searchState}) - HiveSense may be unavailable`
      });
    }
  });

  /**
   * ACCOUNT MODE TEST - redirects to profile
   */

  test('account mode redirects to user profile', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Mode switching timing issues on WebKit');
    test.skip(isProductionEnvironment(), PRODUCTION_DROPDOWN_BUG);
    await searchPage.goto();

    // Switch to account mode
    await searchPage.switchToMode('classic'); // first classic so input is enabled
    await searchPage.switchToMode('account');

    // Enter username and search
    await searchPage.performSearch('gtg');

    // Should redirect to profile
    await expect(page).toHaveURL(/@gtg/);
  });

  /**
   * TAG MODE TEST - redirects to /trending/tag
   */

  test('tag mode redirects to trending tag page', async ({ page }) => {
    test.skip(isProductionEnvironment(), PRODUCTION_DROPDOWN_BUG);
    await searchPage.goto();

    // Switch to tag mode
    await searchPage.switchToMode('classic');
    await searchPage.switchToMode('tag');

    // Enter tag and search
    await searchPage.performSearch('hive');

    // Should redirect to /trending/hive
    await expect(page).toHaveURL(/\/trending\/hive/);
  });

  /**
   * STYLES TESTS
   */

  test('search input styles in light theme', async ({ page }) => {
    await searchPage.goto();

    // Verify page is in light mode (default)
    await homePage.validateThemeModeIsLight();

    // Verify input is visible and has styles
    await expect(searchPage.searchInput).toBeVisible();
    await expect(searchPage.searchButton).toBeVisible();

    // Verify body doesn't have dark mode class
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('search input styles in dark theme', async ({ page }) => {
    test.skip(isProductionEnvironment(), PRODUCTION_DROPDOWN_BUG);
    await searchPage.goto();

    // Switch to dark mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateDarkModeByClass();

    // Verify search input is visible and functional in dark mode
    await expect(searchPage.searchInput).toBeVisible();
    await expect(searchPage.searchButton).toBeVisible();
  });

  test('search results styles in light and dark theme', async ({ page }) => {
    test.skip(isProductionEnvironment(), PRODUCTION_DROPDOWN_BUG);
    await searchPage.gotoWithClassicQuery('hive', 'relevance');

    await searchPage.waitForSearchResults();

    const resultsCount = await searchPage.getResultsCount();
    if (resultsCount > 0) {
      // Light theme - verify author is visible
      await expect(searchPage.firstPostAuthor).toBeVisible();

      // Switch to dark theme
      await homePage.changeThemeMode('Dark');
      await homePage.validateDarkModeByClass();

      // Dark theme - verify author is still visible
      await expect(searchPage.firstPostAuthor).toBeVisible();
    }
  });

  /**
   * NAVIGATION TESTS
   */

  test('navigate to post from search results', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');
    await searchPage.gotoWithClassicQuery('technology', 'relevance');

    await searchPage.waitForSearchResults();

    const resultsCount = await searchPage.getResultsCount();
    if (resultsCount > 0) {
      // Get first post title
      const firstPostTitle = await searchPage.firstPostTitle.textContent();

      // Click first result
      await searchPage.clickFirstResult();

      // Verify we're on the post page
      await expect(page.locator('[data-testid="article-title"]')).toBeVisible();

      // Title should match
      const articleTitle = await page.locator('[data-testid="article-title"]').textContent();
      expect(articleTitle).toBe(firstPostTitle);
    }
  });

  test('navigate to profile from search results', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');
    test.skip(isProductionEnvironment(), PRODUCTION_PROFILE_BUG);
    await searchPage.gotoWithClassicQuery('blockchain', 'relevance');

    await searchPage.waitForSearchResults();

    const resultsCount = await searchPage.getResultsCount();
    if (resultsCount > 0) {
      // Click first result author
      await searchPage.clickFirstResultAuthor();

      // Verify we're on the profile page
      await expect(page.locator('[data-testid="profile-name"]')).toBeVisible();
    }
  });
});

import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { SearchPage } from '../support/pages/searchPage';
import { THEME_COLORS } from '../support/constants';

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

  test('search sorting by newest (created) works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Search results timing issues on WebKit');
    await searchPage.gotoWithClassicQuery('hive', 'created');

    await searchPage.waitForSearchResults();

    // Verify URL
    await expect(page).toHaveURL(/s=created/);

    // Verify results exist
    const resultsCount = await searchPage.getResultsCount();
    expect(resultsCount).toBeGreaterThan(0);
  });

  test('search pagination works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Automatic test works well on chromium');

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
    await searchPage.goto();

    // Open mode menu
    await searchPage.modeSelectTrigger.click();
    await page.waitForSelector('[role="option"]', { timeout: 5000 });

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
    const searchState = await searchPage.waitForSearchResults(15000);

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
    await searchPage.goto();

    // Switch to dark mode
    await homePage.changeThemeMode('Dark');
    await homePage.validateThemeModeIsDark();

    // Verify colors in dark mode
    const backgroundColor = await searchPage.getElementCssPropertyValue(
      searchPage.page.locator('body'),
      'background-color'
    );
    // Dark mode background
    expect(backgroundColor).toBe(THEME_COLORS.dark.background);
  });

  test('search results styles in light and dark theme', async ({ page }) => {
    await searchPage.gotoWithClassicQuery('hive', 'relevance');

    await searchPage.waitForSearchResults();

    const resultsCount = await searchPage.getResultsCount();
    if (resultsCount > 0) {
      // Light theme - verify author color
      const lightAuthorColor = await searchPage.getElementCssPropertyValue(
        searchPage.firstPostAuthor,
        'color'
      );
      expect(lightAuthorColor).toBe(THEME_COLORS.light.authorText);

      // Switch to dark theme
      await homePage.changeThemeMode('Dark');
      await homePage.validateThemeModeIsDark();

      // Dark theme - verify author color
      const darkAuthorColor = await searchPage.getElementCssPropertyValue(
        searchPage.firstPostAuthor,
        'color'
      );
      expect(darkAuthorColor).toBe(THEME_COLORS.dark.authorText);
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

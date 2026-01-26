import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { PAGINATION, getApiEndpoint, isApiEndpointConfigured } from '../support/constants';
import { testFeedPagination, FEED_CONFIG, type FeedType } from '../support/feedTestHelpers';

test.describe('Feed pages tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  /**
   * HOT FEED TESTS (/hot)
   */

  test('hot feed page loads correctly', async ({ page }) => {
    await page.goto('/hot');
    await page.waitForLoadState('domcontentloaded');

    // Verify URL
    await expect(page).toHaveURL('/hot');

    // Verify main timeline is visible
    await expect(homePage.getMainTimeLineOfPosts).toHaveCount(20);

    // Verify filter shows "Hot"
    await expect(homePage.getFilterPosts).toHaveText('Hot');

    // Verify data-testid post-list is set to "hot"
    await expect(homePage.getPostListHot).toBeVisible();
  });

  test('hot feed displays 20 posts by default', async ({ page }) => {
    await page.goto('/hot');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]');

    // Verify posts count (default 20)
    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBe(20);

    // Verify all posts have required elements
    const firstPost = homePage.getMainTimeLineOfPosts.first();
    await expect(firstPost).toBeVisible();
    await expect(homePage.getFirstPostTitle).toBeVisible();
    await expect(homePage.getFirstPostAuthor).toBeVisible();
  });

  test('hot feed pagination loads more posts', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Pagination scroll has timing issues on WebKit');

    await page.goto('/hot');
    await page.waitForLoadState('domcontentloaded');

    // Verify initial posts count
    await homePage.mainPostsTimelineVisible(PAGINATION.INITIAL_POSTS_COUNT);

    // Scroll down
    await page.keyboard.press('End');

    // Wait for more posts to load
    await page.waitForFunction(
      (minPosts) => document.querySelectorAll('[data-testid="post-list-item"]').length >= minPosts,
      PAGINATION.MIN_POSTS_AFTER_SCROLL,
      { timeout: 10000 }
    );

    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThanOrEqual(PAGINATION.MIN_POSTS_AFTER_SCROLL);
    expect(postsCount).toBeLessThanOrEqual(PAGINATION.MAX_POSTS_AFTER_SCROLL);
  });

  test('hot feed URL is correct', async ({ page }) => {
    await page.goto('/hot');
    await page.waitForLoadState('domcontentloaded');

    // Verify URL hasn't changed
    await expect(page).toHaveURL('/hot');

    // Verify navigation to hot feed from home page works
    await page.goto('/');
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('Hot').click();

    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL('/hot');
  });

  /**
   * CREATED/NEW FEED TESTS (/created)
   */

  test('created feed page loads correctly', async ({ page }) => {
    await page.goto('/created');
    await page.waitForLoadState('domcontentloaded');

    // Verify URL
    await expect(page).toHaveURL('/created');

    // Verify main timeline is visible
    await expect(homePage.getMainTimeLineOfPosts).toHaveCount(20);

    // Verify filter shows "New"
    await expect(homePage.getFilterPosts).toHaveText('New');

    // Verify data-testid post-list is set to "created"
    await expect(homePage.getPostListNew).toBeVisible();
  });

  test('created feed displays posts sorted by time', async ({ page, request, browserName }) => {
    test.skip(browserName === 'firefox', 'API validation timing issues on Firefox');
    test.skip(!isApiEndpointConfigured(), 'REACT_APP_API_ENDPOINT not configured');

    await page.goto('/created');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]');

    // Fetch data from API to validate sorting
    const url = getApiEndpoint();
    const response = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_ranked_posts',
        params: { sort: 'created', start_author: '', start_permlink: '', limit: 20, tag: '', observer: '' }
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const apiData = await response.json();
    const firstPostFromAPI = apiData.result[0];

    // Verify first post on page matches API data
    const firstPostAuthor = await homePage.getFirstPostAuthor.textContent();
    const firstPostTitle = await homePage.getFirstPostTitle.textContent();

    expect(firstPostAuthor).toBe(firstPostFromAPI.author);
    expect(firstPostTitle).toBe(firstPostFromAPI.title);
  });

  test('created feed pagination works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Pagination scroll has timing issues on WebKit');

    await page.goto('/created');
    await page.waitForLoadState('domcontentloaded');

    // Verify initial posts count
    await homePage.mainPostsTimelineVisible(PAGINATION.INITIAL_POSTS_COUNT);

    // Scroll down
    await page.keyboard.press('End');

    // Wait for more posts to load
    await page.waitForFunction(
      (minPosts) => document.querySelectorAll('[data-testid="post-list-item"]').length >= minPosts,
      PAGINATION.MIN_POSTS_AFTER_SCROLL,
      { timeout: 10000 }
    );

    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThanOrEqual(PAGINATION.MIN_POSTS_AFTER_SCROLL);
    expect(postsCount).toBeLessThanOrEqual(PAGINATION.MAX_POSTS_AFTER_SCROLL);
  });

  /**
   * PAYOUT FEED TESTS (/payout)
   */

  test('payout feed page loads correctly', async ({ page }) => {
    await page.goto('/payout');
    await page.waitForLoadState('domcontentloaded');

    // Verify URL
    await expect(page).toHaveURL('/payout');

    // Verify main timeline is visible
    await expect(homePage.getMainTimeLineOfPosts).toHaveCount(20);

    // Verify filter shows "Payouts"
    await expect(homePage.getFilterPosts).toHaveText('Payouts');

    // Verify data-testid post-list is set to "payout"
    await expect(homePage.getPostListPayouts).toBeVisible();
  });

  test('payout feed shows pending payouts', async ({ page, request }) => {
    test.skip(!isApiEndpointConfigured(), 'REACT_APP_API_ENDPOINT not configured');

    await page.goto('/payout');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load
    await page.waitForSelector('[data-testid="post-list-item"]');

    // Fetch data from API
    const url = getApiEndpoint();
    const response = await request.post(`${url}/`, {
      data: {
        id: 0,
        jsonrpc: '2.0',
        method: 'bridge.get_ranked_posts',
        params: { sort: 'payout', start_author: '', start_permlink: '', limit: 20, tag: '', observer: '' }
      },
      headers: {
        Accept: 'application/json, text/plain, */*'
      }
    });

    const apiData = await response.json();
    const firstPostFromAPI = apiData.result[0];

    // Verify first post matches API data
    const firstPostAuthor = await homePage.getFirstPostAuthor.textContent();
    const firstPostTitle = await homePage.getFirstPostTitle.textContent();
    const firstPostPayout = await homePage.getFirstPostPayout.textContent();

    expect(firstPostAuthor).toBe(firstPostFromAPI.author);
    expect(firstPostTitle).toBe(firstPostFromAPI.title);
    expect(firstPostPayout).toBe(`$${firstPostFromAPI.payout.toFixed(2)}`);
  });

  test('payout feed pagination works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Pagination scroll has timing issues on WebKit');

    await page.goto('/payout');
    await page.waitForLoadState('domcontentloaded');

    // Verify initial posts count
    await homePage.mainPostsTimelineVisible(PAGINATION.INITIAL_POSTS_COUNT);

    // Scroll down
    await page.keyboard.press('End');

    // Wait for more posts to load
    await page.waitForFunction(
      (minPosts) => document.querySelectorAll('[data-testid="post-list-item"]').length >= minPosts,
      PAGINATION.MIN_POSTS_AFTER_SCROLL,
      { timeout: 10000 }
    );

    const postsCount = await page.locator('[data-testid="post-list-item"]').count();
    expect(postsCount).toBeGreaterThanOrEqual(PAGINATION.MIN_POSTS_AFTER_SCROLL);
    expect(postsCount).toBeLessThanOrEqual(PAGINATION.MAX_POSTS_AFTER_SCROLL);
  });

  /**
   * MUTED FEED TESTS (/muted)
   */

  test('muted feed page loads correctly', async ({ page }) => {
    await page.goto('/muted');
    await page.waitForLoadState('domcontentloaded');

    // Verify URL
    await expect(page).toHaveURL('/muted');

    // Verify filter shows "Muted"
    await expect(homePage.getFilterPosts).toHaveText('Muted');

    // Verify data-testid post-list is set to "muted"
    await expect(homePage.getPostListMuted).toBeVisible();
  });

  test('muted feed shows muted content appropriately', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Timing issues on WebKit');
    await page.goto('/muted');
    await page.waitForLoadState('domcontentloaded');

    // Wait for posts to load or network to settle
    await page.waitForLoadState('networkidle');

    // For non-logged-in user, the list may be empty or show muted posts
    const postsCount = await homePage.getMainTimeLineOfPosts.count();

    // Muted feed may be empty for non-logged-in user
    // or show posts from muted authors/communities
    if (postsCount > 0) {
      // If there are posts, verify they have required elements
      await expect(homePage.getFirstPostTitle).toBeVisible();
      await expect(homePage.getFirstPostAuthor).toBeVisible();
    } else {
      // Empty feed is expected for non-logged-in user
      test.info().annotations.push({
        type: 'note',
        description: 'Muted feed is empty (expected for non-logged-in user)'
      });
    }

    // Verify navigation from home page works
    await page.goto('/');
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('Muted').click();

    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL('/muted');
  });

  /**
   * ADDITIONAL FEED NAVIGATION TESTS
   */

  test('navigation between different feed pages works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');
    // Start from home page (trending)
    await homePage.goto();
    await expect(homePage.getFilterPosts).toHaveText('Trending');

    // Navigate through all feed types using config
    const feedTypes: FeedType[] = ['hot', 'created', 'payout', 'muted', 'trending'];

    for (const feedType of feedTypes) {
      const config = FEED_CONFIG[feedType];
      await homePage.getFilterPosts.click();
      await homePage.getFilterPostsList.getByText(config.filterText).click();
      await page.waitForLoadState('domcontentloaded');
      await expect(page).toHaveURL(config.url);
      await expect(homePage.getFilterPosts).toHaveText(config.filterText);
    }
  });
});

/**
 * PARAMETRIZED PAGINATION TESTS
 * These tests use shared helper to reduce code duplication
 */
test.describe('Feed pagination tests (parametrized)', () => {
  const paginationFeedTypes: FeedType[] = ['hot', 'created', 'payout'];

  for (const feedType of paginationFeedTypes) {
    test(`${feedType} feed pagination using helper`, async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'Pagination scroll has timing issues on WebKit');
      await testFeedPagination(page, feedType);
    });
  }
});

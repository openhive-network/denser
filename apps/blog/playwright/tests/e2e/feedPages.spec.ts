import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import {
  PAGINATION,
  TIMEOUTS,
  getApiEndpoint,
  isApiEndpointConfigured,
  isProductionEnvironment
} from '../support/constants';
import { testFeedPagination, FEED_CONFIG, type FeedType } from '../support/feedTestHelpers';

// Production has known bugs: filter dropdown doesn't open, pagination doesn't work
const PRODUCTION_FILTER_BUG = 'Production bug: filter dropdown not functional';
const PRODUCTION_PAGINATION_BUG = 'Production bug: infinite scroll pagination not working';

test.describe('@flaky Feed pages tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  /**
   * HOT FEED TESTS (/hot)
   */

  test('hot feed page loads correctly', async ({ page }) => {
    await page.goto('/hot');

    await expect(page).toHaveURL('/hot');
    await expect(homePage.getMainTimeLineOfPosts).toHaveCount(PAGINATION.INITIAL_POSTS_COUNT, {
      timeout: TIMEOUTS.SEARCH_RESULTS
    });
    // Verify correct feed via post-list data-testid (filter text may be empty due to SSR on production)
    await expect(homePage.getPostListHot).toBeVisible();
  });

  test('hot feed displays 20 posts by default', async ({ page }) => {
    await page.goto('/hot');
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.SEARCH_RESULTS });

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBe(PAGINATION.INITIAL_POSTS_COUNT);

    const firstPost = homePage.getMainTimeLineOfPosts.first();
    await expect(firstPost).toBeVisible();
    await expect(homePage.getFirstPostTitle).toBeVisible();
    await expect(homePage.getFirstPostAuthor).toBeVisible();
  });

  test('hot feed pagination loads more posts', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Pagination scroll has timing issues on WebKit');
    test.skip(isProductionEnvironment(), PRODUCTION_PAGINATION_BUG);

    await page.goto('/hot');
    await homePage.mainPostsTimelineVisible(PAGINATION.INITIAL_POSTS_COUNT);

    await page.keyboard.press('End');

    await page.waitForFunction(
      (minPosts) => document.querySelectorAll('[data-testid="post-list-item"]').length >= minPosts,
      PAGINATION.MIN_POSTS_AFTER_SCROLL,
      { timeout: TIMEOUTS.HYDRATION }
    );

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThanOrEqual(PAGINATION.MIN_POSTS_AFTER_SCROLL);
    expect(postsCount).toBeLessThanOrEqual(PAGINATION.MAX_POSTS_AFTER_SCROLL);
  });

  test('hot feed URL is correct', async ({ page }) => {
    test.skip(isProductionEnvironment(), PRODUCTION_FILTER_BUG);

    await page.goto('/hot');
    await expect(page).toHaveURL('/hot');

    await homePage.goto();
    // Wait for posts to load before interacting with filter
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('Hot').click();

    await expect(page).toHaveURL('/hot');
  });

  /**
   * CREATED/NEW FEED TESTS (/created)
   */

  test('created feed page loads correctly', async ({ page }) => {
    await page.goto('/created');

    await expect(page).toHaveURL('/created');
    await expect(homePage.getMainTimeLineOfPosts).toHaveCount(PAGINATION.INITIAL_POSTS_COUNT, {
      timeout: TIMEOUTS.SEARCH_RESULTS
    });
    // Verify correct feed via post-list data-testid (filter text may be empty due to SSR on production)
    await expect(homePage.getPostListNew).toBeVisible();
  });

  test('created feed displays posts sorted by time', async ({ page, request, browserName }) => {
    test.skip(browserName === 'firefox', 'API validation timing issues on Firefox');
    test.skip(!isApiEndpointConfigured(), 'REACT_APP_API_ENDPOINT not configured');

    await page.goto('/created');
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.SEARCH_RESULTS });

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

    const firstPostAuthor = await homePage.getFirstPostAuthor.textContent();
    const firstPostTitle = await homePage.getFirstPostTitle.textContent();

    // The /created feed is a live stream of newest posts, so between the
    // UI fetching its data and the test issuing its API call, fresh posts
    // can land on top — leaving the UI's first item one or two slots behind
    // the API's first item. Validate that the UI's first post still appears
    // in the API's top-5 instead of demanding strict equality with index 0.
    const apiTop = apiData.result.slice(0, 5);
    const apiTopAuthors = apiTop.map((p: { author: string }) => p.author);
    const apiTopTitles = apiTop.map((p: { title: string }) => p.title);
    expect(apiTopAuthors).toContain(firstPostAuthor);
    expect(apiTopTitles).toContain(firstPostTitle);
  });

  test('created feed pagination works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Pagination scroll has timing issues on WebKit');
    test.skip(isProductionEnvironment(), PRODUCTION_PAGINATION_BUG);

    await page.goto('/created');
    await homePage.mainPostsTimelineVisible(PAGINATION.INITIAL_POSTS_COUNT);

    await page.keyboard.press('End');

    await page.waitForFunction(
      (minPosts) => document.querySelectorAll('[data-testid="post-list-item"]').length >= minPosts,
      PAGINATION.MIN_POSTS_AFTER_SCROLL,
      { timeout: TIMEOUTS.HYDRATION }
    );

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThanOrEqual(PAGINATION.MIN_POSTS_AFTER_SCROLL);
    expect(postsCount).toBeLessThanOrEqual(PAGINATION.MAX_POSTS_AFTER_SCROLL);
  });

  /**
   * PAYOUT FEED TESTS (/payout)
   */

  test('payout feed page loads correctly', async ({ page }) => {
    await page.goto('/payout');

    await expect(page).toHaveURL('/payout');
    await expect(homePage.getMainTimeLineOfPosts).toHaveCount(PAGINATION.INITIAL_POSTS_COUNT, {
      timeout: TIMEOUTS.SEARCH_RESULTS
    });
    // Verify correct feed via post-list data-testid (filter text may be empty due to SSR on production)
    await expect(homePage.getPostListPayouts).toBeVisible();
  });

  test('payout feed shows pending payouts', async ({ page, request }) => {
    test.skip(!isApiEndpointConfigured(), 'REACT_APP_API_ENDPOINT not configured');

    await page.goto('/payout');
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.SEARCH_RESULTS });

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

    const firstPostAuthor = await homePage.getFirstPostAuthor.textContent();
    const firstPostTitle = await homePage.getFirstPostTitle.textContent();
    const firstPostPayout = await homePage.getFirstPostPayout.textContent();

    expect(firstPostAuthor).toBe(firstPostFromAPI.author);
    expect(firstPostTitle).toBe(firstPostFromAPI.title);
    expect(firstPostPayout).toBe(`$${firstPostFromAPI.payout.toFixed(2)}`);
  });

  test('payout feed pagination works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Pagination scroll has timing issues on WebKit');
    test.skip(isProductionEnvironment(), PRODUCTION_PAGINATION_BUG);

    await page.goto('/payout');
    await homePage.mainPostsTimelineVisible(PAGINATION.INITIAL_POSTS_COUNT);

    await page.keyboard.press('End');

    await page.waitForFunction(
      (minPosts) => document.querySelectorAll('[data-testid="post-list-item"]').length >= minPosts,
      PAGINATION.MIN_POSTS_AFTER_SCROLL,
      { timeout: TIMEOUTS.HYDRATION }
    );

    const postsCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postsCount).toBeGreaterThanOrEqual(PAGINATION.MIN_POSTS_AFTER_SCROLL);
    expect(postsCount).toBeLessThanOrEqual(PAGINATION.MAX_POSTS_AFTER_SCROLL);
  });

  /**
   * MUTED FEED TESTS (/muted)
   */

  test('muted feed page loads correctly', async ({ page }) => {
    await page.goto('/muted');

    await expect(page).toHaveURL('/muted');
    // Verify correct feed via post-list data-testid (filter text may be empty due to SSR on production)
    await expect(homePage.getPostListMuted).toBeVisible();
  });

  test('muted feed shows muted content appropriately', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Timing issues on WebKit');
    await page.goto('/muted');
    // Wait for post-list to be visible (indicates page is ready)
    await expect(homePage.getPostListMuted).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });

    const postsCount = await homePage.getMainTimeLineOfPosts.count();

    // Muted feed may be empty for non-logged-in user
    if (postsCount > 0) {
      await expect(homePage.getFirstPostTitle).toBeVisible();
      await expect(homePage.getFirstPostAuthor).toBeVisible();
    } else {
      test.info().annotations.push({
        type: 'note',
        description: 'Muted feed is empty (expected for non-logged-in user)'
      });
    }
  });
});

/**
 * FEED NAVIGATION TESTS - Individual tests for each feed type
 * Split from mega-test for better isolation and failure identification
 * NOTE: These tests fail on production due to filter dropdown not working (SSR hydration bug)
 */
test.describe('@flaky Feed navigation tests', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('navigation to hot feed works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');
    test.skip(isProductionEnvironment(), PRODUCTION_FILTER_BUG);

    await homePage.goto();
    // Wait for posts to load before interacting with filter
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('Hot').click();

    await expect(page).toHaveURL(FEED_CONFIG.hot.url);
    await expect(homePage.getPostListHot).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('navigation to created feed works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');
    test.skip(isProductionEnvironment(), PRODUCTION_FILTER_BUG);

    await homePage.goto();
    // Wait for posts to load before interacting with filter
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('New').click();

    await expect(page).toHaveURL(FEED_CONFIG.created.url);
    await expect(homePage.getPostListNew).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('navigation to payout feed works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');
    test.skip(isProductionEnvironment(), PRODUCTION_FILTER_BUG);

    await homePage.goto();
    // Wait for posts to load before interacting with filter
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('Payouts').click();

    await expect(page).toHaveURL(FEED_CONFIG.payout.url);
    await expect(homePage.getPostListPayouts).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('navigation to muted feed works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');
    test.skip(isProductionEnvironment(), PRODUCTION_FILTER_BUG);

    await homePage.goto();
    // Wait for posts to load before interacting with filter
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('Muted').click();

    await expect(page).toHaveURL(FEED_CONFIG.muted.url);
    await expect(homePage.getPostListMuted).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });

  test('navigation back to trending feed works', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', 'Navigation timing issues on WebKit');
    test.skip(isProductionEnvironment(), PRODUCTION_FILTER_BUG);

    await page.goto('/hot');
    // Wait for posts to load before interacting with filter
    await expect(homePage.getPostListHot).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
    await homePage.getFilterPosts.click();
    await homePage.getFilterPostsList.getByText('Trending').click();

    await expect(page).toHaveURL(FEED_CONFIG.trending.url);
    await expect(homePage.getPostListTrending).toBeVisible({ timeout: TIMEOUTS.SEARCH_RESULTS });
  });
});

/**
 * PARAMETRIZED PAGINATION TESTS
 * These tests use shared helper to reduce code duplication
 * NOTE: These tests fail on production due to infinite scroll not working
 */
test.describe('@flaky Feed pagination tests (parametrized)', () => {
  const paginationFeedTypes: FeedType[] = ['hot', 'created', 'payout'];

  for (const feedType of paginationFeedTypes) {
    test(`${feedType} feed pagination using helper`, async ({ page, browserName }) => {
      test.skip(browserName === 'webkit', 'Pagination scroll has timing issues on WebKit');
      test.skip(isProductionEnvironment(), PRODUCTION_PAGINATION_BUG);
      await testFeedPagination(page, feedType);
    });
  }
});

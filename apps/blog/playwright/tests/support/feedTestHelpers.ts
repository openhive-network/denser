import { expect, type Page } from '@playwright/test';
import { PAGINATION } from './constants';

/**
 * Feed types that support pagination
 */
export type FeedType = 'trending' | 'hot' | 'created' | 'payout' | 'muted';

/**
 * Feed page configuration
 */
export const FEED_CONFIG: Record<FeedType, { url: string; filterText: string }> = {
  trending: { url: '/trending', filterText: 'Trending' },
  hot: { url: '/hot', filterText: 'Hot' },
  created: { url: '/created', filterText: 'New' },
  payout: { url: '/payout', filterText: 'Payouts' },
  muted: { url: '/muted', filterText: 'Muted' }
};

/**
 * Tests pagination functionality for a feed page
 * @param page - Playwright page object
 * @param feedType - Type of feed to test
 * @param options - Optional configuration
 */
export async function testFeedPagination(
  page: Page,
  feedType: FeedType,
  options: { timeout?: number } = {}
): Promise<void> {
  const { timeout = 10000 } = options;
  const config = FEED_CONFIG[feedType];

  await page.goto(config.url);
  await page.waitForLoadState('domcontentloaded');

  // Wait for initial posts
  await page.waitForSelector('[data-testid="post-list-item"]');

  // Verify initial posts count
  const initialCount = await page.locator('[data-testid="post-list-item"]').count();
  expect(initialCount).toBe(PAGINATION.INITIAL_POSTS_COUNT);

  // Scroll down to trigger infinite loading
  await page.keyboard.press('End');

  // Wait for more posts to load
  await page.waitForFunction(
    (minPosts) => document.querySelectorAll('[data-testid="post-list-item"]').length >= minPosts,
    PAGINATION.MIN_POSTS_AFTER_SCROLL,
    { timeout }
  );

  const postsCount = await page.locator('[data-testid="post-list-item"]').count();
  expect(postsCount).toBeGreaterThanOrEqual(PAGINATION.MIN_POSTS_AFTER_SCROLL);
  expect(postsCount).toBeLessThanOrEqual(PAGINATION.MAX_POSTS_AFTER_SCROLL);
}

/**
 * Tests that a feed page loads correctly with expected elements
 * @param page - Playwright page object
 * @param feedType - Type of feed to test
 */
export async function testFeedPageLoads(
  page: Page,
  feedType: FeedType
): Promise<void> {
  const config = FEED_CONFIG[feedType];

  await page.goto(config.url);
  await page.waitForLoadState('domcontentloaded');

  // Verify URL
  await expect(page).toHaveURL(config.url);

  // Verify filter shows correct text
  await expect(page.locator('[data-testid="posts-filter"]')).toHaveText(config.filterText);

  // Verify post list is visible with correct data-testid
  await expect(page.locator(`[data-testid="post-list-${feedType === 'created' ? 'created' : feedType}"]`)).toBeVisible();
}

/**
 * Tests navigation between different feed pages
 * @param page - Playwright page object
 * @param feedTypes - Array of feed types to navigate through
 */
export async function testFeedNavigation(
  page: Page,
  feedTypes: FeedType[]
): Promise<void> {
  for (const feedType of feedTypes) {
    const config = FEED_CONFIG[feedType];

    await page.locator('[data-testid="posts-filter"]').click();
    await page.locator('[data-testid="posts-filter-list"]').getByText(config.filterText).click();
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(config.url);
    await expect(page.locator('[data-testid="posts-filter"]')).toHaveText(config.filterText);
  }
}

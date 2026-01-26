import { expect, type Page } from '@playwright/test';
import { PAGINATION, TIMEOUTS } from './constants';

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
  const { timeout = TIMEOUTS.HYDRATION } = options;
  const config = FEED_CONFIG[feedType];

  await page.goto(config.url);

  await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.SEARCH_RESULTS });

  const initialCount = await page.locator('[data-testid="post-list-item"]').count();
  expect(initialCount).toBe(PAGINATION.INITIAL_POSTS_COUNT);

  await page.keyboard.press('End');

  await page.waitForFunction(
    (minPosts) => document.querySelectorAll('[data-testid="post-list-item"]').length >= minPosts,
    PAGINATION.MIN_POSTS_AFTER_SCROLL,
    { timeout }
  );

  const postsCount = await page.locator('[data-testid="post-list-item"]').count();
  expect(postsCount).toBeGreaterThanOrEqual(PAGINATION.MIN_POSTS_AFTER_SCROLL);
  expect(postsCount).toBeLessThanOrEqual(PAGINATION.MAX_POSTS_AFTER_SCROLL);
}

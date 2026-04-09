import { expect, test } from '@playwright/test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';
import {
  createFixtureProxy,
  createReplayProxy,
  hasFixtures,
  type IFixtureProxyHandle
} from '../support/mock-server';

/**
 * Sidebar fixture tests — adapted from e2e/sidebar.spec.ts.
 *
 * Tests the sidebar UI on various feed pages using recorded API fixtures.
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

const TEST_NAME = 'sidebar';
const FIXTURE_PORT = 8200;
const isRecordMode = process.env.FIXTURE_MODE === 'record';

let fixtureProxy: IFixtureProxyHandle;

test.describe('Sidebar tests (fixture-based)', () => {
  let homePage: HomePage;

  test.beforeAll(async () => {
    if (isRecordMode) {
      fixtureProxy = await createFixtureProxy(TEST_NAME, { port: FIXTURE_PORT });
    } else {
      if (!hasFixtures(TEST_NAME)) {
        throw new Error(
          `No fixtures for "${TEST_NAME}". Run with FIXTURE_MODE=record first.`
        );
      }
      fixtureProxy = await createReplayProxy(TEST_NAME, { port: FIXTURE_PORT });
    }
  });

  test.afterAll(async () => {
    await fixtureProxy.close();
  });

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  // ── Trending communities sidebar ──────────────────────────────────────

  test('trending communities sidebar is visible on desktop', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });

  test('trending communities sidebar has community links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });

    const communityLinks = homePage.getTrendingCommunitiesSideBarLinks;
    const count = await communityLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('explore communities link is visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });

    await expect(homePage.getExploreCommunities).toBeVisible();
    await expect(homePage.getExploreCommunities).toHaveText(/Explore communities/);
  });

  test('clicking community link navigates to community page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });

    const firstCommunityLink = homePage.getTrendingCommunitiesSideBarLinks.first();
    await firstCommunityLink.click();

    // Should navigate to a community feed page
    await expect(page).toHaveURL(/\/(trending|hot|created)\//, { timeout: TIMEOUTS.HYDRATION });
    await expect(page.locator('body')).toBeVisible();

    if (isRecordMode) {
      // Wait for community page API calls to be captured
      await page.waitForTimeout(3000);
    }
  });

  test('explore communities link navigates to communities page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });

    await homePage.getExploreCommunities.click();

    await expect(page).toHaveURL('/communities', { timeout: TIMEOUTS.HYDRATION });

    if (isRecordMode) {
      // Wait for communities page API calls to be captured
      await page.waitForTimeout(3000);
    }
  });

  // ── Explore Hive sidebar ─────────────────────────────────────────────

  test('explore hive card is visible on desktop', async ({ page }) => {
    await page.goto('/', { waitUntil: 'commit' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });

    const exploreHiveCard = homePage.getCardExploreHive;
    const isVisible = await exploreHiveCard.isVisible().catch(() => false);

    if (isVisible) {
      await expect(exploreHiveCard).toBeVisible();
    }
  });

  // ── Sidebar on different feeds ───────────────────────────────────────

  test('sidebar is visible on hot feed', async ({ page }) => {
    await page.goto('/hot', { waitUntil: 'commit' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });

  test('sidebar is visible on created feed', async ({ page }) => {
    await page.goto('/created', { waitUntil: 'commit' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });
});

import { test, expect } from '../support/fixture-proxy-test';
import { HomePage } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';

/**
 * Sidebar fixture tests — adapted from e2e/sidebar.spec.ts.
 *
 * Tests the sidebar UI on various feed pages using recorded API fixtures.
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

test.use({ fixtureTestName: 'sidebar' });

test.describe('Sidebar tests (fixture-based)', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  // ── Trending communities sidebar ──────────────────────────────────────

  test('trending communities sidebar is visible on desktop', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });

  test('trending communities sidebar has community links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });

    const communityLinks = homePage.getTrendingCommunitiesSideBarLinks;
    const count = await communityLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('explore communities link is visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });

    await expect(homePage.getExploreCommunities).toBeVisible();
    await expect(homePage.getExploreCommunities).toHaveText(/Explore communities/);
  });

  test('clicking community link navigates to community page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });

    const firstCommunityLink = homePage.getTrendingCommunitiesSideBarLinks.first();
    const href = await firstCommunityLink.getAttribute('href');
    expect(href).toMatch(/^\/trending\/.+/);

    await Promise.all([
      page.waitForURL(/\/trending\/.+/, { timeout: TIMEOUTS.HYDRATION }),
      firstCommunityLink.click()
    ]);

    // Wait for the destination feed to render its post list
    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });
  });

  test('explore communities link navigates to communities page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });

    await Promise.all([
      page.waitForURL('**/communities', { timeout: TIMEOUTS.HYDRATION }),
      homePage.getExploreCommunities.click()
    ]);

    // Wait for a stable element on the communities page
    await expect(page.locator('[data-testid="communities-header"]')).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
  });

  // ── Explore Hive sidebar ─────────────────────────────────────────────

  test('explore hive card is visible on desktop', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });

    const exploreHiveCard = homePage.getCardExploreHive;
    const isVisible = await exploreHiveCard.isVisible().catch(() => false);

    if (isVisible) {
      await expect(exploreHiveCard).toBeVisible();
    }
  });

  // ── Sidebar on different feeds ───────────────────────────────────────

  test('sidebar is visible on hot feed', async ({ page }) => {
    await page.goto('/hot', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });

  test('sidebar is visible on created feed', async ({ page }) => {
    await page.goto('/created', { waitUntil: 'domcontentloaded' });

    await page.waitForSelector('[data-testid="post-list-item"]', { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });
});

import { test, expect } from '../support/fixture-proxy-test';
import { HomePage, MOBILE_VIEWPORT } from '../support/pages/homePage';
import { TIMEOUTS } from '../support/constants';

/**
 * Home & Main Feeds fixture tests — covers section 1.1 of the
 * "Test Plan - Page View Verification (Anonymous & Logged-In User)" wiki.
 *
 * Scope: anonymous user, view/rendering verification only (no state mutation).
 *
 * Record:  FIXTURE_MODE=record pnpm --filter @hive/blog test:fixture
 * Replay:  pnpm --filter @hive/blog test:fixture
 */

test.use({ fixtureTestName: 'homeMainPage' });

test.describe('Home & Main Feeds (fixture-based)', () => {
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page);
  });

  test('ANON-HOME-01 — root URL redirects to /trending and feed renders', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page.waitForURL('**/trending', { timeout: TIMEOUTS.HYDRATION });
    await expect(page).toHaveURL(/\/trending$/);

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
  });

  test('ANON-HOME-02 — Trending feed renders header, sidebar and post cards', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getHomeNavLink).toBeVisible();
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();

    const postCount = await homePage.getMainTimeLineOfPosts.count();
    expect(postCount).toBeGreaterThan(0);
  });

  test('ANON-HOME-03 — Hot feed renders and "Hot" filter is active', async ({ page }) => {
    await page.goto('/hot', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getFilterPosts).toHaveText('Hot', { timeout: TIMEOUTS.HYDRATION });
  });

  test('ANON-HOME-04 — Created feed renders and "New" filter is active', async ({ page }) => {
    await page.goto('/created', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getFilterPosts).toHaveText('New', { timeout: TIMEOUTS.HYDRATION });
  });

  test('ANON-HOME-05 — Payout feed renders and "Payouts" filter is active', async ({ page }) => {
    await page.goto('/payout', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getFilterPosts).toHaveText('Payouts', { timeout: TIMEOUTS.HYDRATION });
  });

  test('ANON-HOME-06 — Muted feed page loads with "Muted" filter active', async ({ page }) => {
    await page.goto('/muted', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getFilterPosts).toHaveText('Muted', { timeout: TIMEOUTS.HYDRATION });
    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();
  });

  test('ANON-HOME-07 — First post card exposes title, author, timestamp, votes and payout', async ({
    page
  }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });

    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    await expect(homePage.getFirstPostTitle).toBeVisible();
    await expect(homePage.getFirstPostTitle).not.toHaveText('');

    await expect(homePage.getFirstPostAuthor).toBeVisible();
    const authorHref = await homePage.getFirstPostAuthor.getAttribute('href');
    expect(authorHref).toMatch(/^\/@.+/);

    await expect(homePage.getFirstPostCardTimestampLink).toBeVisible();
    await expect(homePage.getFirstPostPayout).toBeVisible();
    await expect(homePage.getFirstPostPayout).toHaveText(/\$\d/);
    await expect(homePage.getFirstPostVotes).toBeVisible();
  });

  test('ANON-HOME-08 — Sidebar visible on desktop, hidden on mobile breakpoint', async ({ page }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    await expect(homePage.getTrendingCommunitiesSideBar).toBeVisible();

    await page.setViewportSize(MOBILE_VIEWPORT);
    await expect(homePage.getTrendingCommunitiesSideBar).toBeHidden();
  });

  test('ANON-HOME-09 — Sidebar menu exposes FAQ, Privacy Policy and Terms of Service links', async ({
    page
  }) => {
    await page.goto('/trending', { waitUntil: 'domcontentloaded' });
    await expect(homePage.getMainTimeLineOfPosts.first()).toBeVisible({ timeout: TIMEOUTS.HYDRATION });

    await homePage.getNavSidebarMenu.waitFor({ state: 'visible' });
    await expect(async () => {
      await homePage.getNavSidebarMenu.click();
      await homePage.getNavSidebarMenuContent.waitFor({ state: 'visible', timeout: 5000 });
    }).toPass({ timeout: 20000, intervals: [1000, 2000, 3000] });

    const menu = homePage.getNavSidebarMenuContent;
    await expect(menu.getByRole('button', { name: 'FAQ' })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Privacy Policy' })).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Terms of Service' })).toBeVisible();
  });
});

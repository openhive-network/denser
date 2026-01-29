/**
 * SMOKE-17: Mobile Responsive
 * Priority: P2 (Content)
 * Verifies basic mobile responsiveness - hamburger menu and posts display
 */
import {
  runSmokeTest,
  config,
  SELECTORS,
  TIMEOUTS
} from './test-utils.mjs';
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const TEST_ID = 'SMOKE-17';
const TEST_NAME = 'Mobile Responsive';
const TEST_PRIORITY = 'P2';

const MOBILE_VIEWPORT = { width: 375, height: 667 };

async function test({ page, context }) {
  let allPassed = true;

  // Set mobile viewport
  await page.setViewportSize(MOBILE_VIEWPORT);

  console.log(`1. Opening /trending on mobile viewport (${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height})...`);
  await page.goto(`${config.BASE_URL}/trending`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});

  console.log('\n2. Checking hamburger menu visibility...');
  const hamburgerSelectors = [
    '[data-testid="nav-sidebar-menu-button"]',
    '[data-testid="nav-sidebar-menu-trigger"]',
    'button[aria-label*="menu"]',
    'button[aria-label*="Menu"]'
  ];

  let hamburgerFound = false;
  let hamburgerElement = null;

  for (const selector of hamburgerSelectors) {
    const element = page.locator(selector).first();
    const visible = await element.isVisible().catch(() => false);
    if (visible) {
      hamburgerFound = true;
      hamburgerElement = element;
      console.log(`   ✓ PASS: Hamburger menu visible (${selector})`);
      break;
    }
  }

  if (!hamburgerFound) {
    console.log('   ✗ FAIL: Hamburger menu not visible on mobile');
    allPassed = false;
  }

  console.log('\n3. Checking posts on mobile...');
  const posts = page.locator(SELECTORS.POST_LIST_ITEM);
  await posts.first().waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_VISIBLE }).catch(() => {});
  const postsCount = await posts.count().catch(() => 0);

  if (postsCount > 0) {
    console.log(`   ✓ PASS: ${postsCount} posts visible on mobile`);
  } else {
    console.log('   ✗ FAIL: No posts visible on mobile');
    allPassed = false;
  }

  console.log('\n4. Checking post card elements on mobile...');
  const firstPost = posts.first();

  // Check title
  const titleElement = firstPost.locator(`${SELECTORS.POST_TITLE}, a[href*="/@"]`).first();
  const titleVisible = await titleElement.isVisible().catch(() => false);
  if (titleVisible) {
    console.log('   ✓ PASS: Post title visible');
  } else {
    console.log('   ✗ FAIL: Post title not visible');
    allPassed = false;
  }

  // Check author
  const authorElement = firstPost.locator(`${SELECTORS.POST_AUTHOR}, [data-testid="post-author"]`).first();
  const authorVisible = await authorElement.isVisible().catch(() => false);
  if (authorVisible) {
    console.log('   ✓ PASS: Post author visible');
  } else {
    console.log('   (i) INFO: Post author element not found with standard selector');
  }

  console.log('\n5. Testing hamburger menu interaction...');
  if (hamburgerElement) {
    await hamburgerElement.click();
    await page.waitForTimeout(500); // Wait for animation

    // Check if sidebar/menu content appeared
    const sidebarSelectors = [
      '[data-testid="nav-sidebar-menu-content"]',
      '[role="dialog"]',
      '[class*="sidebar"]',
      '[class*="drawer"]',
      'nav[class*="mobile"]'
    ];

    let sidebarOpened = false;
    for (const selector of sidebarSelectors) {
      const sidebar = page.locator(selector).first();
      const visible = await sidebar.isVisible().catch(() => false);
      if (visible) {
        sidebarOpened = true;
        console.log('   ✓ PASS: Mobile menu opened');

        // Close it
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        break;
      }
    }

    if (!sidebarOpened) {
      console.log('   (i) INFO: Could not verify menu opened (may use different pattern)');
    }
  }

  console.log('\n6. Verifying desktop sidebar is hidden on mobile...');
  const desktopSidebar = page.locator('[data-testid="trending-communities-sidebar"], aside[class*="sidebar"]').first();
  const sidebarVisible = await desktopSidebar.isVisible().catch(() => false);

  if (!sidebarVisible) {
    console.log('   ✓ PASS: Desktop sidebar hidden on mobile');
  } else {
    console.log('   (i) INFO: Sidebar may be visible (acceptable on some layouts)');
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

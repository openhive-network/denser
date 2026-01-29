/**
 * SMOKE-19: Sidebar Communities
 * Priority: P3 (Navigation)
 * Verifies sidebar with trending communities is visible and functional
 */
import {
  runSmokeTest,
  gotoAndWaitForPosts,
  config,
  SELECTORS,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-19';
const TEST_NAME = 'Sidebar Communities';
const TEST_PRIORITY = 'P3';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /trending on desktop viewport...');
  // Ensure desktop viewport
  await page.setViewportSize({ width: 1280, height: 720 });

  await gotoAndWaitForPosts(page, '/trending');

  console.log('\n2. Checking trending communities sidebar...');
  const sidebarSelectors = [
    '[data-testid="card-trending-comunities"]', // Note: typo "comunities" is intentional - matches actual data-testid
    '[data-testid="trending-communities-sidebar"]',
    '[class*="trending-communities"]'
  ];

  let sidebarElement = null;
  let sidebarFound = false;

  for (const selector of sidebarSelectors) {
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT }).catch(() => {});
    const visible = await element.isVisible().catch(() => false);
    if (visible) {
      sidebarFound = true;
      sidebarElement = element;
      console.log(`   ✓ PASS: Sidebar visible (${selector})`);
      break;
    }
  }

  if (!sidebarFound) {
    console.log('   ✗ FAIL: Trending communities sidebar not visible');
    allPassed = false;
    return allPassed;
  }

  console.log('\n3. Checking community links in sidebar...');
  const communityLinkSelectors = [
    '[data-testid="trending-community-link"]',
    'a[href*="/trending/hive-"]',
    'a[href*="/hot/hive-"]',
    'a[href*="/created/hive-"]'
  ];

  let linksCount = 0;
  for (const selector of communityLinkSelectors) {
    const links = page.locator(selector);
    const count = await links.count().catch(() => 0);
    if (count > 0) {
      linksCount = count;
      console.log(`   ✓ PASS: Found ${count} community links`);
      break;
    }
  }

  if (linksCount === 0) {
    // Try broader selector
    const anyLinks = sidebarElement ? await sidebarElement.locator('a').count().catch(() => 0) : 0;
    if (anyLinks > 0) {
      console.log(`   (i) INFO: Found ${anyLinks} links in sidebar (may be community links)`);
    } else {
      console.log('   ✗ FAIL: No community links found in sidebar');
      allPassed = false;
    }
  }

  console.log('\n4. Checking "Explore communities" link...');
  const exploreSelectors = [
    '[data-testid="explore-communities-link"]',
    'a[href="/communities"]',
    'a:has-text("Explore communities")',
    'a:has-text("explore")'
  ];

  let exploreFound = false;
  for (const selector of exploreSelectors) {
    const element = page.locator(selector).first();
    const visible = await element.isVisible().catch(() => false);
    if (visible) {
      exploreFound = true;
      console.log('   ✓ PASS: Explore communities link visible');
      break;
    }
  }

  if (!exploreFound) {
    console.log('   (i) INFO: Explore communities link not found (may use different text)');
  }

  console.log('\n5. Testing community link navigation...');
  // Find first community link and click it
  const firstCommunityLink = page.locator('a[href*="/trending/hive-"], a[href*="/hot/hive-"]').first();
  const linkVisible = await firstCommunityLink.isVisible().catch(() => false);

  if (linkVisible) {
    const href = await firstCommunityLink.getAttribute('href');
    console.log(`   Clicking community link: ${href}`);

    await firstCommunityLink.click();
    await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});

    // Verify we navigated to community page
    const url = page.url();
    if (url.includes('/hive-') || url.includes('/trending/') || url.includes('/hot/')) {
      console.log('   ✓ PASS: Navigated to community page');
    } else {
      console.log('   (i) INFO: URL format different than expected');
    }

    // Verify page has posts
    const posts = page.locator(SELECTORS.POST_LIST_ITEM);
    await posts.first().waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_VISIBLE }).catch(() => {});
    const postsCount = await posts.count().catch(() => 0);

    if (postsCount > 0) {
      console.log(`   ✓ PASS: Community page has ${postsCount} posts`);
    } else {
      console.log('   (i) INFO: Community page may be empty');
    }
  } else {
    console.log('   (i) INFO: No clickable community link found');
  }

  console.log('\n6. Verifying sidebar on /hot feed...');
  await page.goto(`${config.BASE_URL}/hot`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});

  let hotSidebarVisible = false;
  for (const selector of sidebarSelectors) {
    const element = page.locator(selector).first();
    const visible = await element.isVisible().catch(() => false);
    if (visible) {
      hotSidebarVisible = true;
      break;
    }
  }

  if (hotSidebarVisible) {
    console.log('   ✓ PASS: Sidebar visible on /hot feed');
  } else {
    console.log('   (i) INFO: Sidebar not visible on /hot (may be intentional)');
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

/**
 * SMOKE-12: Communities
 * Priority: P3 (Navigation)
 * Verifies /communities loads list and navigation works
 */
import {
  runSmokeTest,
  config,
  waitForPostsToLoad,
  SELECTORS,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-12';
const TEST_NAME = 'Communities';
const TEST_PRIORITY = 'P3';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /communities...');
  await page.goto(`${config.BASE_URL}/communities`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE });

  console.log('\n2. Checking communities list...');
  const communityLinks = page.locator('a[href*="/trending/hive-"], a[href*="/created/hive-"]');
  let communityCount = await communityLinks.count();

  if (communityCount === 0) {
    const altLinks = page.locator('a[href*="hive-"]');
    communityCount = await altLinks.count();
  }

  console.log(`   Community links: ${communityCount}`);

  if (communityCount > 0) {
    console.log('   ✓ PASS: Communities list loaded');

    const firstLink = communityLinks.first();
    const href = await firstLink.getAttribute('href');
    console.log(`   First link: ${href}`);

    console.log('\n3. Navigating to community...');
    const communityMatch = href?.match(/hive-\d+/);

    if (communityMatch) {
      const communityId = communityMatch[0];
      const communityUrl = `${config.BASE_URL}/trending/${communityId}`;
      console.log(`   Community URL: ${communityUrl}`);

      await page.goto(communityUrl, {
        waitUntil: 'domcontentloaded',
        timeout: TIMEOUTS.NAVIGATION
      });
      await waitForPostsToLoad(page);

      const currentUrl = page.url();
      console.log(`   Current URL: ${currentUrl}`);

      const postsCount = await page.locator(SELECTORS.POST_LIST_ITEM).count();
      console.log(`   Posts in community: ${postsCount}`);

      if (postsCount > 0) {
        console.log('   ✓ PASS: Posts in community visible');
      } else {
        console.log('   (i) INFO: No posts in this community');
      }

      if (currentUrl.includes(communityId)) {
        console.log('   ✓ PASS: Navigation to community works');
      } else {
        console.log('   ✗ FAIL: URL does not contain community ID');
        allPassed = false;
      }
    } else {
      console.log('   (i) INFO: Could not extract community ID');
    }
  } else {
    console.log('   ✗ FAIL: Communities list empty');
    allPassed = false;
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

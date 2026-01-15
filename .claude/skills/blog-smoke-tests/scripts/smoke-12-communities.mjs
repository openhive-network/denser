/**
 * SMOKE-12: Communities
 * Priority: P3 (Navigation)
 * Verifies /communities loads list and navigation works
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-12: Communities');
  console.log('========================================\n');

  const headless = process.env.HEADLESS === 'true';
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    let allPassed = true;

    console.log('1. Opening /communities...');
    await page.goto(`${BASE_URL}/communities`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

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
        const communityUrl = `${BASE_URL}/trending/${communityId}`;
        console.log(`   Community URL: ${communityUrl}`);

        await page.goto(communityUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

        const currentUrl = page.url();
        console.log(`   Current URL: ${currentUrl}`);

        const postsCount = await page.locator('[data-testid="post-list-item"]').count();
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

    console.log('\n========================================');
    console.log(allPassed ? '✓ SMOKE-12: PASS' : '✗ SMOKE-12: FAIL');
    console.log('========================================');
    return allPassed;

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

runTest().then(passed => process.exit(passed ? 0 : 1));

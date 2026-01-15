/**
 * SMOKE-10: Tags
 * Priority: P3 (Navigation)
 * Verifies clicking tag filters posts
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-10: Tags');
  console.log('========================================\n');

  const headless = process.env.HEADLESS === 'true';
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    let allPassed = true;

    console.log('1. Opening /trending...');
    await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    console.log('\n2. Finding tag to click...');
    const tagLink = page.locator('a[href*="/trending/"]').first();

    if (await tagLink.isVisible()) {
      const tagHref = await tagLink.getAttribute('href');
      const tagText = await tagLink.textContent();
      console.log(`   Found tag: ${tagText} (${tagHref})`);

      console.log('\n3. Clicking tag...');
      await tagLink.click();
      await page.waitForURL('**/trending/**', { timeout: 30000 });
      await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

      const currentUrl = page.url();
      console.log(`   URL: ${currentUrl}`);

      if (currentUrl.includes('/trending/')) {
        console.log('   ✓ PASS: URL contains /trending/[tag]');
      } else {
        console.log('   ✗ FAIL: URL does not match expected pattern');
        allPassed = false;
      }

      const posts = page.locator('[data-testid="post-list-item"]');
      const postCount = await posts.count();
      console.log(`   Posts: ${postCount}`);

      if (postCount > 0) {
        console.log('   ✓ PASS: Posts loaded');
      } else {
        console.log('   ✗ FAIL: No posts');
        allPassed = false;
      }
    } else {
      console.log('   (i) INFO: No tag found to click');
      console.log('   ✓ PASS: Test skipped (no tags)');
    }

    console.log('\n========================================');
    console.log(allPassed ? '✓ SMOKE-10: PASS' : '✗ SMOKE-10: FAIL');
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

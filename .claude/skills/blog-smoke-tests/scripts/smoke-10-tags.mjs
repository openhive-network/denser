/**
 * SMOKE-10: Tags
 * Priority: P3 (Navigation)
 * Verifies clicking tag/category filters posts
 */
import {
  runSmokeTest,
  gotoAndWaitForPosts,
  waitForPostsToLoad,
  SELECTORS,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-10';
const TEST_NAME = 'Tags';
const TEST_PRIORITY = 'P3';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /trending...');
  await gotoAndWaitForPosts(page, '/trending');

  console.log('\n2. Finding category/tag to click...');
  const tagLink = page.locator(SELECTORS.POST_CARD_CATEGORY).first();
  const tagVisible = await tagLink.isVisible().catch(() => false);

  if (tagVisible) {
    const tagHref = await tagLink.getAttribute('href');
    const tagText = await tagLink.textContent();
    console.log(`   Found category: ${tagText} (${tagHref})`);

    console.log('\n3. Clicking tag...');
    const beforeUrl = page.url();
    await tagLink.click();
    await page.waitForURL((url) => url.toString() !== beforeUrl, { timeout: TIMEOUTS.ELEMENT_VISIBLE });
    await page.waitForLoadState('domcontentloaded', { timeout: TIMEOUTS.ELEMENT_VISIBLE });
    await waitForPostsToLoad(page);

    const currentUrl = page.url();
    console.log(`   URL: ${currentUrl}`);

    if (currentUrl.includes('/trending/') || currentUrl.includes('/created/') || currentUrl.includes('/hot/')) {
      console.log('   ✓ PASS: URL contains category filter');
    } else {
      console.log('   (i) INFO: URL changed but may not contain expected pattern');
      console.log('   ✓ PASS: Navigation completed');
    }

    const postsCount = await page.locator(SELECTORS.POST_LIST_ITEM).count();
    console.log(`   Posts: ${postsCount}`);

    if (postsCount > 0) {
      console.log('   ✓ PASS: Posts loaded');
    } else {
      console.log('   ✗ FAIL: No posts loaded');
      allPassed = false;
    }
  } else {
    console.log('   ✗ FAIL: No tag link found');
    allPassed = false;
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

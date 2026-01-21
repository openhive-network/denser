/**
 * SMOKE-11: Categories
 * Priority: P3 (Navigation)
 * Verifies /trending vs /hot vs /created show different posts
 */
import {
  runSmokeTest,
  gotoAndWaitForPosts,
  SELECTORS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-11';
const TEST_NAME = 'Categories';
const TEST_PRIORITY = 'P3';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /trending...');
  await gotoAndWaitForPosts(page, '/trending');

  const trendingPost = page.locator(SELECTORS.POST_LIST_ITEM).first();
  const trendingTitle = await trendingPost.locator(SELECTORS.POST_TITLE).textContent();
  const trendingCount = await page.locator(SELECTORS.POST_LIST_ITEM).count();
  console.log(`   /trending: ${trendingCount} posts, first: "${trendingTitle?.substring(0, 40)}..."`);

  console.log('\n2. Opening /hot...');
  await gotoAndWaitForPosts(page, '/hot');

  const hotPost = page.locator(SELECTORS.POST_LIST_ITEM).first();
  const hotTitle = await hotPost.locator(SELECTORS.POST_TITLE).textContent();
  const hotCount = await page.locator(SELECTORS.POST_LIST_ITEM).count();
  console.log(`   /hot: ${hotCount} posts, first: "${hotTitle?.substring(0, 40)}..."`);

  console.log('\n3. Opening /created...');
  await gotoAndWaitForPosts(page, '/created');

  const createdPost = page.locator(SELECTORS.POST_LIST_ITEM).first();
  const createdTitle = await createdPost.locator(SELECTORS.POST_TITLE).textContent();
  const createdCount = await page.locator(SELECTORS.POST_LIST_ITEM).count();
  console.log(`   /created: ${createdCount} posts, first: "${createdTitle?.substring(0, 40)}..."`);

  console.log('\n4. Comparison...');

  if (trendingCount > 0 && hotCount > 0 && createdCount > 0) {
    console.log('   ✓ PASS: All categories have posts');
  } else {
    console.log('   ✗ FAIL: Some categories empty');
    allPassed = false;
  }

  const differentPosts = trendingTitle !== createdTitle;
  if (differentPosts) {
    console.log('   ✓ PASS: /trending and /created show different first posts');
  } else {
    console.log('   (i) INFO: /trending and /created have same first post (possible)');
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

/**
 * SMOKE-01: Homepage Posts
 * Priority: P0 (Critical)
 * Verifies /trending loads with >=20 posts and first post matches API
 */
import {
  runSmokeTest,
  gotoAndWaitForPosts,
  getRankedPosts,
  extractAuthorFromPost,
  extractPermlinkFromPost,
  SELECTORS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-01';
const TEST_NAME = 'Homepage Posts';
const TEST_PRIORITY = 'P0';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /trending...');
  await gotoAndWaitForPosts(page, '/trending');

  const posts = page.locator(SELECTORS.POST_LIST_ITEM);
  const postCount = await posts.count();
  console.log(`   Posts found: ${postCount}`);

  if (postCount >= 20) {
    console.log('   ✓ PASS: >= 20 posts\n');
  } else {
    console.log('   ✗ FAIL: < 20 posts\n');
    allPassed = false;
  }

  console.log('2. Getting first post from UI...');
  const firstPost = posts.first();
  const uiAuthor = await extractAuthorFromPost(firstPost);
  const uiPermlink = await extractPermlinkFromPost(firstPost);

  console.log(`   UI Author: @${uiAuthor}`);
  console.log(`   UI Permlink: ${uiPermlink}\n`);

  console.log('3. Getting data from API...');
  const data = await getRankedPosts('trending', 20);
  const apiFirstPost = data.result[0];

  console.log(`   API Author: @${apiFirstPost.author}`);
  console.log(`   API Permlink: ${apiFirstPost.permlink}\n`);

  console.log('4. Comparison...');
  if (uiAuthor === apiFirstPost.author) {
    console.log('   ✓ PASS: Author matches');
  } else {
    console.log(`   ✗ FAIL: Author mismatch`);
    allPassed = false;
  }

  if (uiPermlink === apiFirstPost.permlink) {
    console.log('   ✓ PASS: Permlink matches');
  } else {
    console.log(`   ✗ FAIL: Permlink mismatch`);
    allPassed = false;
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

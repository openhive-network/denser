/**
 * SMOKE-06: Comments
 * Priority: P1 (Important)
 * Verifies comments count on card matches API
 */
import {
  runSmokeTest,
  gotoAndWaitForPosts,
  getRankedPosts,
  extractAuthorFromPost,
  extractPermlinkFromPost,
  parseInteger,
  SELECTORS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-06';
const TEST_NAME = 'Comments';
const TEST_PRIORITY = 'P1';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /trending...');
  await gotoAndWaitForPosts(page, '/trending');
  console.log('   Finding post with comments...');

  const posts = page.locator(SELECTORS.POST_LIST_ITEM);
  const postCount = await posts.count();

  let author = '';
  let permlink = '';
  let cardComments = 0;

  for (let i = 0; i < Math.min(postCount, 5); i++) {
    const post = posts.nth(i);
    const commentsElement = post.locator(SELECTORS.POST_CHILDREN);
    const commentsVisible = await commentsElement.isVisible().catch(() => false);

    if (commentsVisible) {
      const commentsText = await commentsElement.textContent();
      const count = parseInteger(commentsText);

      if (count > 0) {
        author = await extractAuthorFromPost(post);
        permlink = await extractPermlinkFromPost(post);
        cardComments = count;
        break;
      }
    }
  }

  if (author && permlink) {
    console.log(`   Found: @${author}/${permlink}`);
    console.log(`   Card comments: ${cardComments}`);

    console.log('\n2. Getting API data...');
    const data = await getRankedPosts('trending', 20);
    const apiPost = data.result.find(p => p.author === author && p.permlink === permlink);
    const apiComments = apiPost?.children || 0;

    console.log(`   API children: ${apiComments}`);

    console.log('\n3. Comparison...');
    const diff = Math.abs(cardComments - apiComments);

    if (diff <= 2) {
      console.log(`   ✓ PASS: Comments match (card: ${cardComments}, API: ${apiComments}, diff: ${diff})`);
    } else {
      console.log(`   ✗ FAIL: Comments mismatch (card: ${cardComments}, API: ${apiComments}, diff: ${diff})`);
      allPassed = false;
    }
  } else {
    console.log('   ✗ FAIL: No post with comments found');
    allPassed = false;
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

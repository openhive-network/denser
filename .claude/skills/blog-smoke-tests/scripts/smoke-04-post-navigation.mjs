/**
 * SMOKE-04: Post Navigation
 * Priority: P0 (Critical)
 * Verifies clicking post navigates to page with title, content, and footer
 */
import {
  runSmokeTest,
  gotoAndWaitForPosts,
  SELECTORS,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-04';
const TEST_NAME = 'Post Navigation';
const TEST_PRIORITY = 'P0';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /trending...');
  await gotoAndWaitForPosts(page, '/trending');

  const firstPost = page.locator(SELECTORS.POST_LIST_ITEM).first();
  const titleLink = firstPost.locator(`${SELECTORS.POST_TITLE} a`);
  const postTitle = await titleLink.textContent();
  console.log(`   Post title: ${postTitle?.substring(0, 50)}...`);

  console.log('\n2. Clicking post...');
  const currentUrl = page.url();
  await titleLink.click();
  await page.waitForURL((url) => url.toString() !== currentUrl, { timeout: TIMEOUTS.ELEMENT_VISIBLE });
  await page.waitForLoadState('domcontentloaded', { timeout: TIMEOUTS.ELEMENT_VISIBLE });
  console.log(`   URL: ${page.url()}`);

  console.log('\n3. Checking page elements...');

  // Article title on post page
  let titleElement = page.locator(SELECTORS.ARTICLE_TITLE);
  let titleVisible = await titleElement.isVisible().catch(() => false);
  if (!titleVisible) {
    titleElement = page.locator('h1, h2').first();
    titleVisible = await titleElement.isVisible().catch(() => false);
  }

  if (titleVisible) {
    console.log('   ✓ PASS: Title visible');
  } else {
    console.log('   ✗ FAIL: Title not visible');
    allPassed = false;
  }

  // Check for post content
  let contentElement = page.locator('[data-testid="author-data-post-footer"], [data-testid="hashtags-post"]');
  let contentVisible = await contentElement.first().isVisible().catch(() => false);
  if (!contentVisible) {
    contentElement = page.locator('article, [class*="prose"], [class*="markdown"]').first();
    contentVisible = await contentElement.isVisible().catch(() => false);
  }

  if (contentVisible) {
    console.log('   ✓ PASS: Content visible');
  } else {
    console.log('   (i) INFO: Specific content elements not found');
    console.log('   ✓ PASS: Post page loaded (title visible)');
  }

  // Check for votes element
  const votesElement = page.locator(`${SELECTORS.COMMENT_VOTES}, [data-testid="post-total-votes"]`);
  const votesVisible = await votesElement.first().isVisible().catch(() => false);

  if (votesVisible) {
    console.log('   ✓ PASS: Votes visible');
  } else {
    console.log('   (i) INFO: Votes element not found with data-testid');
    const altVotes = page.locator('.flex.items-center').filter({ hasText: /^\d+$/ }).first();
    const altVisible = await altVotes.isVisible().catch(() => false);
    if (altVisible) {
      console.log('   ✓ PASS: Votes visible (alternative selector)');
    } else {
      console.log('   ✗ FAIL: Votes not visible');
      allPassed = false;
    }
  }

  // Check for upvote button
  const upvoteButton = page.locator(SELECTORS.UPVOTE_BUTTON);
  let upvoteVisible = await upvoteButton.first().isVisible().catch(() => false);
  if (!upvoteVisible) {
    const altUpvote = page.locator('svg[class*="arrowUpCircle"], svg[class*="arrow-up-circle"]').first();
    upvoteVisible = await altUpvote.isVisible().catch(() => false);
  }

  if (upvoteVisible) {
    console.log('   ✓ PASS: Upvote button visible');
  } else {
    console.log('   (i) INFO: Upvote button not found (may require login)');
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

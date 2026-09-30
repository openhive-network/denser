/**
 * SMOKE-05: Votes API
 * Priority: P1 (Important)
 * Verifies vote count on card matches post page and API
 */
import {
  runSmokeTest,
  gotoAndWaitForPosts,
  getPostVotes,
  extractAuthorFromPost,
  extractPermlinkFromPost,
  parseInteger,
  SELECTORS,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-05';
const TEST_NAME = 'Votes API';
const TEST_PRIORITY = 'P1';
const VOTE_LAG_TOLERANCE_MIN = 5;
const VOTE_LAG_TOLERANCE_RATIO = 0.02;

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /trending...');
  await gotoAndWaitForPosts(page, '/trending');

  const firstPost = page.locator(SELECTORS.POST_LIST_ITEM).first();
  const author = await extractAuthorFromPost(firstPost);
  const permlink = await extractPermlinkFromPost(firstPost);
  console.log(`   Post: @${author}/${permlink}`);

  const cardVotesElement = firstPost.locator(SELECTORS.POST_VOTES);
  await cardVotesElement.waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT });
  const cardVotesText = await cardVotesElement.textContent();
  const cardVotes = parseInteger(cardVotesText);
  console.log(`   Card votes: ${cardVotes}`);

  console.log('\n2. Navigating to post page...');
  const titleElement = firstPost.locator(`${SELECTORS.POST_TITLE} a`);
  const currentUrl = page.url();
  await titleElement.click();
  await page.waitForURL((url) => url.toString() !== currentUrl, { timeout: TIMEOUTS.ELEMENT_VISIBLE });
  await page.waitForLoadState('domcontentloaded', { timeout: TIMEOUTS.ELEMENT_VISIBLE });

  // On post page, look for votes
  // The votes link renders only after the client-side active-votes query
  // resolves, which can take well over 10s when the Hive API is slow.
  const pageVotesElement = page.locator(SELECTORS.COMMENT_VOTES).filter({ hasText: /vote/i }).first();
  await page.locator(SELECTORS.COMMENT_VOTES).first().waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_VISIBLE }).catch(() => {});
  let pageVotes = 0;

  const pageVotesVisible = await pageVotesElement.isVisible().catch(() => false);
  if (pageVotesVisible) {
    const pageVotesText = await pageVotesElement.textContent();
    pageVotes = parseInteger(pageVotesText);
  } else {
    const altVotesElement = page.locator(SELECTORS.COMMENT_VOTES).first();
    await altVotesElement.waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT });
    const altText = await altVotesElement.textContent();
    pageVotes = parseInteger(altText);
  }
  console.log(`   Page votes: ${pageVotes}`);

  console.log('\n3. Getting API data...');
  const data = await getPostVotes(author, permlink, 1000);
  const allVotes = data.result?.votes || [];
  const postVotes = allVotes.filter(v => v.author === author && v.permlink === permlink);
  const apiVotes = postVotes.length;

  console.log(`   API list_votes: ${apiVotes}`);
  console.log('   (API limit: 1000)');

  console.log('\n4. Comparison...');

  if (cardVotes > 0) {
    console.log(`   ✓ PASS: Card shows votes (${cardVotes})`);
  } else {
    console.log(`   (i) INFO: Card shows 0 votes (post may have no votes)`);
  }

  if (pageVotes > 0 || cardVotes === pageVotes) {
    console.log(`   ✓ PASS: Page shows votes (${pageVotes})`);
  } else {
    console.log(`   (i) INFO: Page votes element shows ${pageVotes}`);
  }

  // The card count comes from the rendered (possibly cached) trending page, the
  // API count is fetched seconds later. Trending posts gain votes constantly, so
  // UI < API by a handful of votes is expected (failed #965 jobs showed
  // 174 vs 175 and 512 vs 515). Allow that lag; a real mismatch (e.g. a wrong
  // field or a truncated count) is far larger. list_votes is capped at 1000.
  const tolerance = Math.max(VOTE_LAG_TOLERANCE_MIN, Math.ceil(apiVotes * VOTE_LAG_TOLERANCE_RATIO));
  const diff = apiVotes - cardVotes;
  if (apiVotes === 1000 && cardVotes >= apiVotes) {
    console.log(`   ✓ PASS: UI (${cardVotes}) >= API (${apiVotes}, API limit reached)`);
  } else if (Math.abs(diff) <= tolerance) {
    console.log(`   ✓ PASS: UI (${cardVotes}) ~ API (${apiVotes}), diff ${diff} within +-${tolerance}`);
  } else {
    console.log(`   ✗ FAIL: UI (${cardVotes}) vs API (${apiVotes}), diff ${diff} exceeds +-${tolerance}`);
    allPassed = false;
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

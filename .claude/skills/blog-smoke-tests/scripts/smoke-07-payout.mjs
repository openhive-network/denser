/**
 * SMOKE-07: Payout
 * Priority: P1 (Important)
 * Verifies payout value matches API calculation
 */
import {
  runSmokeTest,
  gotoAndWaitForPosts,
  getRankedPosts,
  extractAuthorFromPost,
  extractPermlinkFromPost,
  parseNumber,
  SELECTORS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-07';
const TEST_NAME = 'Payout';
const TEST_PRIORITY = 'P1';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /trending...');
  await gotoAndWaitForPosts(page, '/trending');

  const firstPost = page.locator(SELECTORS.POST_LIST_ITEM).first();
  const author = await extractAuthorFromPost(firstPost);
  const permlink = await extractPermlinkFromPost(firstPost);
  console.log(`   Post: @${author}/${permlink}`);

  const payoutElement = firstPost.locator(SELECTORS.POST_PAYOUT);
  const payoutText = await payoutElement.textContent();
  const uiPayout = parseNumber(payoutText);
  console.log(`   UI Payout: $${uiPayout.toFixed(2)}`);

  console.log('\n2. Getting API data...');
  const data = await getRankedPosts('trending', 20);
  const apiPost = data.result.find(p => p.author === author && p.permlink === permlink);

  const isPaidout = apiPost?.is_paidout || false;
  console.log(`   API is_paidout: ${isPaidout}`);

  let apiPayout = 0;
  if (isPaidout) {
    apiPayout = parseNumber(apiPost?.payout || '0');
  } else {
    apiPayout = parseNumber(apiPost?.pending_payout_value?.replace(' HBD', '') || '0');
  }
  console.log(`   API Payout: $${apiPayout.toFixed(2)}`);

  console.log('\n3. Comparison (tolerance: $0.10)...');
  const diff = Math.abs(uiPayout - apiPayout);

  if (diff <= 0.10) {
    console.log(`   ✓ PASS: Payout matches (diff: $${diff.toFixed(2)})`);
  } else {
    console.log(`   ✗ FAIL: Payout mismatch (UI: $${uiPayout.toFixed(2)}, API: $${apiPayout.toFixed(2)}, diff: $${diff.toFixed(2)})`);
    allPassed = false;
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

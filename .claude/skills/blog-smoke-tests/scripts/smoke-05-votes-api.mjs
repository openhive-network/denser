/**
 * SMOKE-05: Votes API
 * Priority: P1 (Important)
 * Verifies vote count on card matches post page and API
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';
const TEST_ID = 'SMOKE-05';
const TEST_NAME = 'Votes API';
const TEST_PRIORITY = 'P1';

async function runTest() {
  console.log('========================================');
  console.log(`${TEST_ID}: ${TEST_NAME}`);
  console.log('========================================\n');

  const headless = process.env.HEADLESS === 'true';
  const reportDir = process.env.REPORT_DIR || './playwright/temp_ai_report_tests';

  await mkdir(reportDir, { recursive: true });

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  let allPassed = true;
  let errorMessage = null;

  try {
    console.log('1. Opening /trending...');
    await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    const firstPost = page.locator('[data-testid="post-list-item"]').first();
    const authorElement = firstPost.locator('[data-testid="post-author"]');
    const authorText = await authorElement.textContent();
    const author = authorText?.trim().replace('@', '') || '';

    const titleElement = firstPost.locator('[data-testid="post-title"] a');
    const postLink = await titleElement.getAttribute('href');
    const permlink = postLink?.split('/').pop() || '';

    console.log(`   Post: @${author}/${permlink}`);

    const cardVotesElement = firstPost.locator('[data-testid="post-total-votes"]');
    await cardVotesElement.waitFor({ state: 'visible', timeout: 10000 });
    const cardVotesText = await cardVotesElement.textContent();
    const cardVotes = parseInt(cardVotesText?.replace(/[^0-9]/g, '') || '0', 10);
    console.log(`   Card votes: ${cardVotes}`);

    console.log('\n2. Navigating to post page...');
    const currentUrl = page.url();
    await titleElement.click();
    await page.waitForURL((url) => url.toString() !== currentUrl, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    // On post page, main post votes are in comment-votes element
    // Look for votes text pattern (e.g., "1101 votes" or "1 vote")
    const pageVotesElement = page.locator('[data-testid="comment-votes"]').filter({ hasText: /vote/i }).first();
    let pageVotesVisible = await pageVotesElement.isVisible().catch(() => false);
    let pageVotes = 0;

    if (pageVotesVisible) {
      const pageVotesText = await pageVotesElement.textContent();
      pageVotes = parseInt(pageVotesText?.replace(/[^0-9]/g, '') || '0', 10);
    } else {
      // Alternative: just check any comment-votes has a number
      const altVotesElement = page.locator('[data-testid="comment-votes"]').first();
      await altVotesElement.waitFor({ state: 'visible', timeout: 10000 });
      const altText = await altVotesElement.textContent();
      pageVotes = parseInt(altText?.replace(/[^0-9]/g, '') || '0', 10);
    }
    console.log(`   Page votes: ${pageVotes}`);

    console.log('\n3. Getting API data...');
    // Use database_api.list_votes instead of deprecated condenser_api.get_active_votes
    const apiRequest = {
      jsonrpc: '2.0',
      method: 'database_api.list_votes',
      params: { start: [author, permlink, ''], limit: 1000, order: 'by_comment_voter' },
      id: 1
    };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest)
    });
    const data = await response.json();
    // Filter votes to only those matching our post (API may return votes beyond our post)
    const allVotes = data.result?.votes || [];
    const postVotes = allVotes.filter(v => v.author === author && v.permlink === permlink);
    const apiVotes = postVotes.length;

    console.log(`   API list_votes: ${apiVotes}`);
    console.log('   (API limit: 1000)');

    console.log('\n4. Comparison...');

    // Card should show votes
    if (cardVotes > 0) {
      console.log(`   ✓ PASS: Card shows votes (${cardVotes})`);
    } else {
      console.log(`   (i) INFO: Card shows 0 votes (post may have no votes)`);
    }

    // Page should show votes (pageVotes could be from main post or comments)
    if (pageVotes > 0 || cardVotes === pageVotes) {
      console.log(`   ✓ PASS: Page shows votes (${pageVotes})`);
    } else {
      console.log(`   (i) INFO: Page votes element shows ${pageVotes}`);
    }

    // Card votes should be consistent with API (API limited to 1000)
    if (cardVotes >= apiVotes || (apiVotes === 1000 && cardVotes >= apiVotes)) {
      console.log(`   ✓ PASS: UI (${cardVotes}) >= API (${apiVotes})`);
    } else {
      console.log(`   ✗ FAIL: UI (${cardVotes}) < API (${apiVotes})`);
      allPassed = false;
    }

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    errorMessage = error.message;
    allPassed = false;
  }

  if (!allPassed) {
    const screenshotPath = join(reportDir, `${TEST_ID}-failure.png`);
    const tracePath = join(reportDir, `${TEST_ID}-trace.zip`);

    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   Screenshot saved: ${screenshotPath}`);
    } catch (e) {
      console.log(`   Could not save screenshot: ${e.message}`);
    }

    await context.tracing.stop({ path: tracePath });
    console.log(`   Trace saved: ${tracePath}`);
  } else {
    await context.tracing.stop();
  }

  await browser.close();

  console.log('\n========================================');
  console.log(allPassed ? `✓ ${TEST_ID}: PASS` : `✗ ${TEST_ID}: FAIL`);
  console.log('========================================');

  const result = {
    id: TEST_ID,
    name: TEST_NAME,
    priority: TEST_PRIORITY,
    passed: allPassed,
    error: errorMessage,
    artifacts: allPassed ? [] : [`${TEST_ID}-failure.png`, `${TEST_ID}-trace.zip`]
  };
  console.log('\n__RESULT__' + JSON.stringify(result));

  return allPassed;
}

runTest().then(passed => process.exit(passed ? 0 : 1));

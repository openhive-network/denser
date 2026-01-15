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

    const cardVotesElement = firstPost.locator('[data-testid="post-votes"]');
    const cardVotesText = await cardVotesElement.textContent();
    const cardVotes = parseInt(cardVotesText?.replace(/[^0-9]/g, '') || '0', 10);
    console.log(`   Card votes: ${cardVotes}`);

    console.log('\n2. Navigating to post page...');
    await titleElement.click();
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 });

    const pageVotesElement = page.locator('[data-testid="post-votes"]').first();
    await pageVotesElement.waitFor({ state: 'visible', timeout: 10000 });
    const pageVotesText = await pageVotesElement.textContent();
    const pageVotes = parseInt(pageVotesText?.replace(/[^0-9]/g, '') || '0', 10);
    console.log(`   Page votes: ${pageVotes}`);

    console.log('\n3. Getting API data...');
    const apiRequest = {
      jsonrpc: '2.0',
      method: 'condenser_api.get_active_votes',
      params: [author, permlink],
      id: 1
    };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest)
    });
    const data = await response.json();
    const apiVotes = data.result?.length || 0;

    console.log(`   API active_votes: ${apiVotes}`);
    console.log('   (API limit: 1000)');

    console.log('\n4. Comparison...');

    if (cardVotes === pageVotes) {
      console.log(`   ✓ PASS: Card = Page (${cardVotes})`);
    } else {
      console.log(`   ✗ FAIL: Card (${cardVotes}) != Page (${pageVotes})`);
      allPassed = false;
    }

    if (cardVotes >= apiVotes) {
      console.log(`   ✓ PASS: UI (${cardVotes}) >= API limit (${apiVotes})`);
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

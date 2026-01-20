/**
 * SMOKE-07: Payout
 * Priority: P1 (Important)
 * Verifies payout value matches API calculation
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL || 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';
const TEST_ID = 'SMOKE-07';
const TEST_NAME = 'Payout';
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

    const payoutElement = firstPost.locator('[data-testid="post-payout"]');
    const payoutText = await payoutElement.textContent();
    const uiPayout = parseFloat(payoutText?.replace(/[^0-9.]/g, '') || '0');
    console.log(`   UI Payout: $${uiPayout.toFixed(2)}`);

    console.log('\n2. Getting API data...');
    const apiRequest = {
      jsonrpc: '2.0',
      method: 'bridge.get_ranked_posts',
      params: { sort: 'trending', tag: '', observer: '', limit: 20 },
      id: 1
    };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest)
    });
    const data = await response.json();
    const apiPost = data.result.find(p => p.author === author && p.permlink === permlink);

    const isPaidout = apiPost?.is_paidout || false;
    console.log(`   API is_paidout: ${isPaidout}`);

    let apiPayout = 0;
    if (isPaidout) {
      apiPayout = parseFloat(apiPost?.payout || '0');
    } else {
      apiPayout = parseFloat(apiPost?.pending_payout_value?.replace(' HBD', '') || '0');
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

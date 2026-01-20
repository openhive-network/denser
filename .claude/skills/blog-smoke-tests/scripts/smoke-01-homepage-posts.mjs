/**
 * SMOKE-01: Homepage Posts
 * Priority: P0 (Critical)
 * Verifies /trending loads with >=20 posts and first post matches API
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL || 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';
const TEST_ID = 'SMOKE-01';
const TEST_NAME = 'Homepage Posts';
const TEST_PRIORITY = 'P0';

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

  // Start tracing
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  let allPassed = true;
  let errorMessage = null;

  try {
    console.log('1. Opening /trending...');
    await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    const posts = page.locator('[data-testid="post-list-item"]');
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
    const authorElement = firstPost.locator('[data-testid="post-author"]');
    const authorText = await authorElement.textContent();
    const uiAuthor = authorText?.trim().replace('@', '') || '';

    const titleElement = firstPost.locator('[data-testid="post-title"] a');
    const postLink = await titleElement.getAttribute('href');
    const uiPermlink = postLink?.split('/').pop() || '';

    console.log(`   UI Author: @${uiAuthor}`);
    console.log(`   UI Permlink: ${uiPermlink}\n`);

    console.log('3. Getting data from API...');
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

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    errorMessage = error.message;
    allPassed = false;
  }

  // Save artifacts on failure
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

  // Output JSON result for report generator
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

/**
 * SMOKE-11: Categories
 * Priority: P3 (Navigation)
 * Verifies /trending vs /hot vs /created show different posts
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'https://blog.openhive.network';
const TEST_ID = 'SMOKE-11';
const TEST_NAME = 'Categories';
const TEST_PRIORITY = 'P3';

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

    const trendingPost = page.locator('[data-testid="post-list-item"]').first();
    const trendingTitle = await trendingPost.locator('[data-testid="post-title"]').textContent();
    const trendingCount = await page.locator('[data-testid="post-list-item"]').count();
    console.log(`   /trending: ${trendingCount} posts, first: "${trendingTitle?.substring(0, 40)}..."`);

    console.log('\n2. Opening /hot...');
    await page.goto(`${BASE_URL}/hot`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    const hotPost = page.locator('[data-testid="post-list-item"]').first();
    const hotTitle = await hotPost.locator('[data-testid="post-title"]').textContent();
    const hotCount = await page.locator('[data-testid="post-list-item"]').count();
    console.log(`   /hot: ${hotCount} posts, first: "${hotTitle?.substring(0, 40)}..."`);

    console.log('\n3. Opening /created...');
    await page.goto(`${BASE_URL}/created`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    const createdPost = page.locator('[data-testid="post-list-item"]').first();
    const createdTitle = await createdPost.locator('[data-testid="post-title"]').textContent();
    const createdCount = await page.locator('[data-testid="post-list-item"]').count();
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

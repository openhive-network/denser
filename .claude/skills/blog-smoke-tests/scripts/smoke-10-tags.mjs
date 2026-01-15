/**
 * SMOKE-10: Tags
 * Priority: P3 (Navigation)
 * Verifies clicking tag shows filtered posts
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'https://blog.openhive.network';
const TEST_ID = 'SMOKE-10';
const TEST_NAME = 'Tags';
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

    console.log('\n2. Finding tag to click...');

    const tagLink = page.locator('a[href*="/trending/"]').filter({ hasText: /^[A-Za-z]/ }).first();
    const tagVisible = await tagLink.isVisible().catch(() => false);

    if (tagVisible) {
      const tagHref = await tagLink.getAttribute('href');
      const tagText = await tagLink.textContent();
      console.log(`   Found tag: ${tagText} (${tagHref})`);

      console.log('\n3. Clicking tag...');
      await tagLink.click();
      await page.waitForLoadState('domcontentloaded', { timeout: 30000 });
      await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

      const currentUrl = page.url();
      console.log(`   URL: ${currentUrl}`);

      if (currentUrl.includes('/trending/')) {
        console.log('   ✓ PASS: URL contains /trending/[tag]');
      } else {
        console.log('   ✗ FAIL: URL does not contain /trending/[tag]');
        allPassed = false;
      }

      const postsCount = await page.locator('[data-testid="post-list-item"]').count();
      console.log(`   Posts: ${postsCount}`);

      if (postsCount > 0) {
        console.log('   ✓ PASS: Posts loaded');
      } else {
        console.log('   ✗ FAIL: No posts loaded');
        allPassed = false;
      }
    } else {
      console.log('   ✗ FAIL: No tag link found');
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

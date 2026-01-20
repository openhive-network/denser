/**
 * SMOKE-12: Communities
 * Priority: P3 (Navigation)
 * Verifies /communities loads list and navigation works
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL || 'https://blog.openhive.network';
const TEST_ID = 'SMOKE-12';
const TEST_NAME = 'Communities';
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
    console.log('1. Opening /communities...');
    await page.goto(`${BASE_URL}/communities`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    console.log('\n2. Checking communities list...');

    const communityLinks = page.locator('a[href*="/trending/hive-"], a[href*="/created/hive-"]');
    let communityCount = await communityLinks.count();

    if (communityCount === 0) {
      const altLinks = page.locator('a[href*="hive-"]');
      communityCount = await altLinks.count();
    }

    console.log(`   Community links: ${communityCount}`);

    if (communityCount > 0) {
      console.log('   ✓ PASS: Communities list loaded');

      const firstLink = communityLinks.first();
      const href = await firstLink.getAttribute('href');
      console.log(`   First link: ${href}`);

      console.log('\n3. Navigating to community...');

      const communityMatch = href?.match(/hive-\d+/);
      if (communityMatch) {
        const communityId = communityMatch[0];
        const communityUrl = `${BASE_URL}/trending/${communityId}`;
        console.log(`   Community URL: ${communityUrl}`);

        await page.goto(communityUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

        const currentUrl = page.url();
        console.log(`   Current URL: ${currentUrl}`);

        const postsCount = await page.locator('[data-testid="post-list-item"]').count();
        console.log(`   Posts in community: ${postsCount}`);

        if (postsCount > 0) {
          console.log('   ✓ PASS: Posts in community visible');
        } else {
          console.log('   (i) INFO: No posts in this community');
        }

        if (currentUrl.includes(communityId)) {
          console.log('   ✓ PASS: Navigation to community works');
        } else {
          console.log('   ✗ FAIL: URL does not contain community ID');
          allPassed = false;
        }
      } else {
        console.log('   (i) INFO: Could not extract community ID');
      }
    } else {
      console.log('   ✗ FAIL: Communities list empty');
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

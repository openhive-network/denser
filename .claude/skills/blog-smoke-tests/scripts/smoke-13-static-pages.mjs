/**
 * SMOKE-13: Static Pages
 * Priority: P4 (Additional)
 * Verifies /faq.html, /privacy.html, /tos.html return HTTP 200
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'https://blog.openhive.network';
const TEST_ID = 'SMOKE-13';
const TEST_NAME = 'Static Pages';
const TEST_PRIORITY = 'P4';

const STATIC_PAGES = [
  { path: '/faq.html', name: 'FAQ' },
  { path: '/privacy.html', name: 'Privacy Policy' },
  { path: '/tos.html', name: 'Terms of Service' }
];

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
    for (const staticPage of STATIC_PAGES) {
      console.log(`Checking ${staticPage.name} (${staticPage.path})...`);

      const response = await page.goto(`${BASE_URL}${staticPage.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      const status = response?.status() || 0;

      if (status === 200) {
        const bodyText = await page.locator('body').textContent();
        const hasContent = (bodyText?.length || 0) > 100;

        if (hasContent) {
          console.log(`   ✓ PASS: HTTP ${status}, content: ${bodyText?.length} chars\n`);
        } else {
          console.log(`   ✗ FAIL: HTTP ${status}, but page empty\n`);
          allPassed = false;
        }
      } else {
        console.log(`   ✗ FAIL: HTTP ${status}\n`);
        allPassed = false;
      }
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

  console.log('========================================');
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

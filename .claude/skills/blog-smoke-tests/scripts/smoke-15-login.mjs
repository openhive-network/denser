/**
 * SMOKE-15: Login Button
 * Priority: P4 (Additional)
 * Verifies login button exists and is clickable
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'https://blog.openhive.network';
const TEST_ID = 'SMOKE-15';
const TEST_NAME = 'Login Button';
const TEST_PRIORITY = 'P4';

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

    console.log('\n2. Finding Login button...');

    let loginButton = page.locator('[data-testid="login-btn"]');
    let buttonFound = await loginButton.isVisible().catch(() => false);

    if (!buttonFound) {
      loginButton = page.locator('button:has-text("Login"), a:has-text("Login")').first();
      buttonFound = await loginButton.isVisible().catch(() => false);
    }

    if (buttonFound) {
      const buttonText = await loginButton.textContent();
      console.log(`   ✓ PASS: Login button found: "${buttonText}"`);

      console.log('\n3. Checking if button is interactive...');

      const isEnabled = await loginButton.isEnabled();
      if (isEnabled) {
        console.log('   ✓ PASS: Button is enabled');
      } else {
        console.log('   ✗ FAIL: Button is disabled');
        allPassed = false;
      }

      console.log('\n4. Clicking button...');
      try {
        await loginButton.click({ timeout: 5000 });
        console.log('   ✓ PASS: Click executed without error');
      } catch (clickError) {
        console.log(`   ✗ FAIL: Click error: ${clickError.message}`);
        allPassed = false;
      }
    } else {
      console.log('   ✗ FAIL: Login button not found');
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

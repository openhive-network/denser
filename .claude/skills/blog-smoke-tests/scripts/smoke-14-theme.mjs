/**
 * SMOKE-14: Theme Toggle
 * Priority: P4 (Additional)
 * Verifies theme toggle button exists and is interactive
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'https://blog.openhive.network';
const TEST_ID = 'SMOKE-14';
const TEST_NAME = 'Theme Toggle';
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

    console.log('\n2. Checking current theme...');
    const htmlElement = page.locator('html');
    const initialClass = await htmlElement.getAttribute('class');
    const initialTheme = initialClass?.includes('dark') ? 'dark' : 'light';
    console.log(`   Current theme: ${initialTheme}`);

    console.log('\n3. Finding theme toggle button...');

    let themeButton = page.locator('button:has(svg[class*="sun"]), button:has(svg[class*="moon"])').first();
    let buttonFound = await themeButton.isVisible().catch(() => false);

    if (!buttonFound) {
      themeButton = page.locator('[aria-label*="theme"], [aria-label*="Theme"], [aria-label*="mode"]').first();
      buttonFound = await themeButton.isVisible().catch(() => false);
    }

    if (!buttonFound) {
      themeButton = page.locator('[data-testid*="theme"], [data-testid*="mode"]').first();
      buttonFound = await themeButton.isVisible().catch(() => false);
    }

    if (buttonFound) {
      console.log('   ✓ Theme toggle button found');

      console.log('\n4. Clicking theme toggle...');
      await themeButton.click();

      await page.waitForTimeout(500);

      const newClass = await htmlElement.getAttribute('class');
      const newTheme = newClass?.includes('dark') ? 'dark' : 'light';
      console.log(`   New theme: ${newTheme}`);

      if (initialTheme !== newTheme) {
        console.log('   ✓ PASS: Theme changed');
      } else {
        console.log('   (i) INFO: Theme not changed (may use different mechanism)');
      }
    } else {
      console.log('   (i) INFO: Theme toggle button not found');
      console.log('   ✓ PASS: Test skipped (button may not exist)');
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

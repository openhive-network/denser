/**
 * SMOKE-15: Login Button
 * Priority: P4 (Additional)
 * Verifies login button exists and is clickable
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-15: Login Button');
  console.log('========================================\n');

  const headless = process.env.HEADLESS === 'true';
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    let allPassed = true;

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

    console.log('\n========================================');
    console.log(allPassed ? '✓ SMOKE-15: PASS' : '✗ SMOKE-15: FAIL');
    console.log('========================================');
    return allPassed;

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

runTest().then(passed => process.exit(passed ? 0 : 1));

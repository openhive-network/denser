/**
 * SMOKE-15: Login Button
 * Priority: P4 (Additional)
 * Verifies login button exists and is clickable
 */
import {
  runSmokeTest,
  gotoAndWaitForPosts,
  SELECTORS,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-15';
const TEST_NAME = 'Login Button';
const TEST_PRIORITY = 'P4';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /trending...');
  await gotoAndWaitForPosts(page, '/trending');

  console.log('\n2. Finding Login button...');
  let loginButton = page.locator(SELECTORS.LOGIN_BTN);
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
      await loginButton.click({ timeout: TIMEOUTS.SHORT / 2 });
      console.log('   ✓ PASS: Click executed without error');

      // Verify login modal appeared
      const loginModal = page.locator('[role="dialog"]');
      const modalVisible = await loginModal.isVisible().catch(() => false);

      if (modalVisible) {
        console.log('   ✓ PASS: Login modal opened');
      } else {
        console.log('   (i) INFO: Login modal not immediately visible');
      }
    } catch (clickError) {
      console.log(`   ✗ FAIL: Click error: ${clickError.message}`);
      allPassed = false;
    }
  } else {
    console.log('   ✗ FAIL: Login button not found');
    allPassed = false;
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

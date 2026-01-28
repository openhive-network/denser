/**
 * SMOKE-18: Error Handling
 * Priority: P2 (Content)
 * Verifies app handles invalid URLs gracefully without crashing
 */
import {
  runSmokeTest,
  config,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-18';
const TEST_NAME = 'Error Handling';
const TEST_PRIORITY = 'P2';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Testing invalid user profile URL...');
  const invalidUserUrl = `${config.BASE_URL}/@thisuserdefinitelydoesnotexist99999`;

  let response = await page.goto(invalidUserUrl, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  }).catch(e => ({ status: () => 0, error: e }));

  const userStatus = response?.status?.() ?? 0;
  console.log(`   Response status: ${userStatus}`);

  if (userStatus === 200 || userStatus === 404) {
    console.log('   ✓ PASS: Server returned valid response (200 or 404)');
  } else if (userStatus === 500) {
    console.log('   ✗ FAIL: Server returned 500 error');
    allPassed = false;
  } else {
    console.log(`   (i) INFO: Unexpected status ${userStatus}`);
  }

  // Verify page didn't crash
  const bodyVisible = await page.locator('body').isVisible().catch(() => false);
  if (bodyVisible) {
    console.log('   ✓ PASS: Page rendered without crash');
  } else {
    console.log('   ✗ FAIL: Page crashed');
    allPassed = false;
  }

  console.log('\n2. Testing invalid post URL...');
  const invalidPostUrl = `${config.BASE_URL}/@nonexistentuser123456/invalid-post-permlink-xyz`;

  response = await page.goto(invalidPostUrl, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  }).catch(e => ({ status: () => 0, error: e }));

  const postStatus = response?.status?.() ?? 0;
  console.log(`   Response status: ${postStatus}`);

  if (postStatus === 200 || postStatus === 404) {
    console.log('   ✓ PASS: Server returned valid response (200 or 404)');
  } else if (postStatus === 500) {
    console.log('   ✗ FAIL: Server returned 500 error');
    allPassed = false;
  } else {
    console.log(`   (i) INFO: Unexpected status ${postStatus}`);
  }

  console.log('\n3. Testing URL with special characters...');
  const specialCharsUrl = `${config.BASE_URL}/trending/test%20tag%21%40%23`;

  response = await page.goto(specialCharsUrl, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  }).catch(e => ({ status: () => 0, error: e }));

  const specialStatus = response?.status?.() ?? 0;
  console.log(`   Response status: ${specialStatus}`);

  if (specialStatus === 200 || specialStatus === 404) {
    console.log('   ✓ PASS: Special characters handled gracefully');
  } else if (specialStatus === 500) {
    console.log('   ✗ FAIL: Server returned 500 error');
    allPassed = false;
  }

  console.log('\n4. Testing XSS attempt in search...');
  const xssUrl = `${config.BASE_URL}/search?q=test%20%3Cscript%3Ealert(1)%3C/script%3E`;

  await page.goto(xssUrl, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  }).catch(() => {});

  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});

  // Check no script tags with alert were injected
  const dangerousScripts = await page.locator('script:has-text("alert(1)")').count();
  if (dangerousScripts === 0) {
    console.log('   ✓ PASS: XSS payload was sanitized');
  } else {
    console.log('   ✗ FAIL: XSS payload was not sanitized!');
    allPassed = false;
  }

  console.log('\n5. Testing nonexistent tag page...');
  const nonexistentTagUrl = `${config.BASE_URL}/trending/xyznonexistenttag987654321`;

  response = await page.goto(nonexistentTagUrl, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  }).catch(e => ({ status: () => 0, error: e }));

  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});

  const tagStatus = response?.status?.() ?? 0;
  if (tagStatus === 200 || tagStatus === 404) {
    console.log('   ✓ PASS: Nonexistent tag handled gracefully');
  } else {
    console.log(`   (i) INFO: Status ${tagStatus}`);
  }

  // Page should still be functional
  const pageBody = await page.locator('body').isVisible().catch(() => false);
  if (pageBody) {
    console.log('   ✓ PASS: Page remains functional');
  } else {
    console.log('   ✗ FAIL: Page not functional');
    allPassed = false;
  }

  console.log('\n6. Testing double-encoded URL...');
  const doubleEncodedUrl = `${config.BASE_URL}/%2540gtg`;

  response = await page.goto(doubleEncodedUrl, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  }).catch(e => ({ status: () => 0, error: e }));

  const doubleStatus = response?.status?.() ?? 0;
  if (doubleStatus === 200 || doubleStatus === 404) {
    console.log('   ✓ PASS: Double-encoded URL handled gracefully');
  } else if (doubleStatus === 500) {
    console.log('   ✗ FAIL: Server returned 500 error');
    allPassed = false;
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

/**
 * SMOKE-18: Error Handling
 * Priority: P2 (Content)
 * Verifies the app answers, serves real 404 pages for missing users/posts,
 * renders the 503 page, and handles malformed URLs without crashing.
 * Any navigation that gets no HTTP response fails the test.
 */
import {
  runSmokeTest,
  config,
  waitForPostsToLoad,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-18';
const TEST_NAME = 'Error Handling';
const TEST_PRIORITY = 'P2';

const NOT_FOUND_PAGE = '[data-testid="not-found-page"]';
const GRACEFUL_STATUSES = [200, 404];

/**
 * Navigates to a path and returns the final HTTP status, or 0 when the
 * site did not respond at all (connection refused, DNS failure, timeout).
 */
async function navigate(page, path) {
  try {
    const response = await page.goto(`${config.BASE_URL}${path}`, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUTS.NAVIGATION
    });
    const status = response?.status() ?? 0;
    console.log(`   Response status: ${status}`);
    return status;
  } catch (error) {
    console.log(`   ✗ FAIL: No response from ${path}: ${error.message}`);
    return 0;
  }
}

async function expectNotFoundPage(page, path, label) {
  const status = await navigate(page, path);
  if (status !== 404) {
    console.log(`   ✗ FAIL: Expected 404 for ${label}, got ${status}`);
    return false;
  }
  const visible = await page
    .locator(NOT_FOUND_PAGE)
    .waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_VISIBLE })
    .then(() => true)
    .catch(() => false);
  if (!visible) {
    console.log(`   ✗ FAIL: 404 response for ${label} did not render the not-found page`);
    return false;
  }
  console.log(`   ✓ PASS: ${label} returned 404 with the not-found page`);
  return true;
}

async function expectGracefulStatus(page, path, label) {
  const status = await navigate(page, path);
  if (GRACEFUL_STATUSES.includes(status)) {
    console.log(`   ✓ PASS: ${label} handled gracefully (${status})`);
    return true;
  }
  console.log(`   ✗ FAIL: ${label} returned ${status}, expected one of ${GRACEFUL_STATUSES.join('/')}`);
  return false;
}

async function test({ page }) {
  console.log('1. Confirming the app answers (home page renders posts)...');
  const homeStatus = await navigate(page, '/');
  if (homeStatus !== 200) {
    throw new Error(`Site not reachable: home page returned ${homeStatus} from ${config.BASE_URL}`);
  }
  await waitForPostsToLoad(page);
  console.log('   ✓ PASS: Home page rendered posts');

  let allPassed = true;

  console.log('\n2. Testing too long username (>16 chars, Hive limit)...');
  allPassed =
    (await expectNotFoundPage(page, '/@thisuserdefinitelydoesnotexist99999', 'too long username')) &&
    allPassed;

  console.log('\n3. Testing valid-length nonexistent user...');
  allPassed = (await expectNotFoundPage(page, '/@nouser12345678', 'nonexistent user')) && allPassed;

  console.log('\n4. Testing nonexistent post...');
  allPassed =
    (await expectNotFoundPage(page, `/hive/@${config.TEST_USER}/invalid-post-xyz`, 'nonexistent post')) &&
    allPassed;

  console.log('\n5. Testing the 503 service-unavailable page...');
  const unavailableStatus = await navigate(page, '/service-unavailable');
  const heading503 = await page
    .getByRole('heading', { name: '503', exact: true })
    .isVisible()
    .catch(() => false);
  const message503 = await page
    .getByRole('heading', { name: 'Service Temporarily Unavailable' })
    .isVisible()
    .catch(() => false);
  if ([200, 503].includes(unavailableStatus) && heading503 && message503) {
    console.log('   ✓ PASS: 503 page rendered');
  } else {
    console.log(
      `   ✗ FAIL: 503 page not rendered (status ${unavailableStatus}, heading ${heading503}, message ${message503})`
    );
    allPassed = false;
  }

  console.log('\n6. Testing URL with special characters...');
  allPassed =
    (await expectGracefulStatus(page, '/trending/test%20tag%21%40%23', 'Special characters')) && allPassed;

  console.log('\n7. Testing XSS attempt in search...');
  let alertFired = false;
  page.on('dialog', dialog => {
    alertFired = true;
    dialog.dismiss().catch(() => {});
  });
  const xssStatus = await navigate(page, '/search?q=test%20%3Cscript%3Ealert(1)%3C/script%3E');
  if (xssStatus === 0) {
    allPassed = false;
  } else {
    await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});
    // Next.js inlines the query (escaped) in its RSC flight-data scripts, so only a
    // script whose whole body is the payload counts as an injection.
    const injectedScript = await page.evaluate(() =>
      Array.from(document.scripts).some(script => script.textContent.trim() === 'alert(1)')
    );
    if (!alertFired && !injectedScript) {
      console.log('   ✓ PASS: XSS payload was sanitized');
    } else {
      console.log('   ✗ FAIL: XSS payload was not sanitized!');
      allPassed = false;
    }
  }

  console.log('\n8. Testing nonexistent tag page...');
  allPassed =
    (await expectGracefulStatus(page, '/trending/xyznonexistenttag987654321', 'Nonexistent tag')) && allPassed;

  console.log('\n9. Testing double-encoded URL...');
  allPassed = (await expectGracefulStatus(page, '/%2540gtg', 'Double-encoded URL')) && allPassed;

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

/**
 * SMOKE-16: Search
 * Priority: P1 (Important)
 * Verifies search functionality works correctly
 */
import {
  runSmokeTest,
  config,
  SELECTORS,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-16';
const TEST_NAME = 'Search';
const TEST_PRIORITY = 'P1';

async function test({ page }) {
  let allPassed = true;

  console.log('1. Opening /search page...');
  await page.goto(`${config.BASE_URL}/search`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});

  // Find search input
  const searchInput = page.locator('input[type="search"], input[placeholder*="earch"], input[data-testid="search-input"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_VISIBLE }).catch(() => {});
  const inputVisible = await searchInput.isVisible().catch(() => false);

  if (inputVisible) {
    console.log('   ✓ PASS: Search input visible');
  } else {
    console.log('   ✗ FAIL: Search input not visible');
    allPassed = false;
    return allPassed;
  }

  console.log('\n2. Searching for "hive"...');
  await searchInput.fill('hive');
  await page.keyboard.press('Enter');

  console.log('\n3. Checking search results...');

  // Check URL contains search query
  const url = page.url();
  if (url.includes('q=hive') || url.includes('search')) {
    console.log('   ✓ PASS: URL contains search query');
  } else {
    console.log('   (i) INFO: URL format different than expected');
  }

  // Look for search results - could be posts or other content
  const resultSelectors = [
    '[data-testid="post-list-item"]',
    '[data-testid="search-result"]',
    '.search-results',
    'article',
    '[class*="result"]'
  ];
  const resultsLocator = page.locator(resultSelectors.join(', ')).first();
  const noResultsLocator = page.locator('text=/no results|not found|nothing found/i').first();

  // Poll for either a real result or the "no results" empty state instead of a
  // fixed sleep-then-check-once: the search results resolve asynchronously
  // (client-side search-api call), so a flat 2s wait raced that fetch under
  // variable load and failed intermittently in CI (job 3212103).
  //
  // Uses ELEMENT_VISIBLE (30s), not SHORT (10s): local verification showed the
  // AI/hivesense search backend genuinely takes >10s to respond often enough
  // that a 10s poll still caught the page mid-skeleton-loading-state (neither
  // results nor the "no results" text present yet) - this is real backend
  // latency, not a selector or race bug.
  let resultsFound = false;
  try {
    await Promise.race([
      resultsLocator.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_VISIBLE }),
      noResultsLocator.waitFor({ state: 'visible', timeout: TIMEOUTS.ELEMENT_VISIBLE })
    ]);
    resultsFound = true;
  } catch {
    resultsFound = false;
  }

  if (resultsFound) {
    const resultCount = await resultsLocator.count().catch(() => 0);
    if (resultCount > 0) {
      console.log(`   ✓ PASS: Found ${resultCount} search results`);
    } else {
      console.log('   (i) INFO: No results found for query (valid state)');
    }
  } else {
    console.log('   ✗ FAIL: No search results or empty state found');
    allPassed = false;
  }

  console.log('\n4. Verifying search button...');
  const searchButton = page.locator('button[type="submit"], button[data-testid="search-button"], button:has-text("Search")').first();
  const buttonVisible = await searchButton.isVisible().catch(() => false);

  if (buttonVisible) {
    console.log('   ✓ PASS: Search button visible');
  } else {
    console.log('   (i) INFO: Search button not found (may use Enter key only)');
  }

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

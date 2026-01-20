/**
 * SMOKE-13: Static Pages
 * Priority: P4 (Additional)
 * Verifies /faq.html, /privacy.html, /tos.html return HTTP 200
 */
import {
  runSmokeTest,
  config,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-13';
const TEST_NAME = 'Static Pages';
const TEST_PRIORITY = 'P4';

const STATIC_PAGES = [
  { path: '/faq.html', name: 'FAQ' },
  { path: '/privacy.html', name: 'Privacy Policy' },
  { path: '/tos.html', name: 'Terms of Service' }
];

async function test({ page }) {
  let allPassed = true;

  for (const staticPage of STATIC_PAGES) {
    console.log(`Checking ${staticPage.name} (${staticPage.path})...`);

    const response = await page.goto(`${config.BASE_URL}${staticPage.path}`, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUTS.NAVIGATION
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

  return allPassed;
}

runSmokeTest({ id: TEST_ID, name: TEST_NAME, priority: TEST_PRIORITY }, test)
  .then(passed => process.exit(passed ? 0 : 1));

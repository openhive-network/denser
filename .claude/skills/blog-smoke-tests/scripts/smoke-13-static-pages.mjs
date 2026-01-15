/**
 * SMOKE-13: Static Pages
 * Priority: P4 (Additional)
 * Verifies /faq.html, /privacy.html, /tos.html return HTTP 200
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';

const STATIC_PAGES = [
  { path: '/faq.html', name: 'FAQ' },
  { path: '/privacy.html', name: 'Privacy Policy' },
  { path: '/tos.html', name: 'Terms of Service' }
];

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-13: Static Pages');
  console.log('========================================\n');

  const headless = process.env.HEADLESS === 'true';
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    let allPassed = true;

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

    console.log('========================================');
    console.log(allPassed ? '✓ SMOKE-13: PASS' : '✗ SMOKE-13: FAIL');
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

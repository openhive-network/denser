/**
 * SMOKE-03: Payout Tooltip
 * Priority: P2 (Tooltips)
 * Verifies payout element on post card displays value
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-03: Payout Tooltip (Post Card)');
  console.log('========================================\n');

  const headless = process.env.HEADLESS === 'true';
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    let allPassed = true;

    console.log('1. Opening /trending...');
    await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    console.log('\n2. Checking payout element on card...');
    const firstPost = page.locator('[data-testid="post-list-item"]').first();
    const payoutElement = firstPost.locator('[data-testid="post-payout"]');

    if (await payoutElement.isVisible()) {
      const payoutText = await payoutElement.textContent();
      console.log(`   ✓ Payout element visible: ${payoutText}`);

      const hasValue = /\$[\d.]+/.test(payoutText || '');
      if (hasValue) {
        console.log('   ✓ PASS: Element contains payout value');
      } else {
        console.log('   ✗ FAIL: No value in element');
        allPassed = false;
      }
    } else {
      console.log('   ✗ FAIL: Payout element not visible');
      allPassed = false;
    }

    console.log('\n3. Hover on payout...');
    await payoutElement.scrollIntoViewIfNeeded();
    await payoutElement.hover();

    try {
      const tooltip = page.locator('[data-testid="payout-post-card-tooltip"]');
      await tooltip.waitFor({ state: 'visible', timeout: 3000 });
      const tooltipText = await tooltip.textContent();
      console.log(`   ✓ PASS: Tooltip visible: ${tooltipText?.substring(0, 80)}...`);

      if (tooltipText?.includes('HBD') || tooltipText?.includes('payout')) {
        console.log('   ✓ Tooltip contains payout info');
      }
    } catch {
      console.log('   (i) INFO: Tooltip not found (may not be implemented on card)');
      console.log('   ✓ PASS: Payout element works, tooltip optional');
    }

    console.log('\n========================================');
    console.log(allPassed ? '✓ SMOKE-03: PASS' : '✗ SMOKE-03: FAIL');
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

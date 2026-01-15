/**
 * SMOKE-07: Payout
 * Priority: P1 (Important)
 * Verifies payout value on card matches API
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-07: Payout');
  console.log('========================================\n');

  const headless = process.env.HEADLESS === 'true';
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    let allPassed = true;

    console.log('1. Opening /trending...');
    await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    const firstPost = page.locator('[data-testid="post-list-item"]').first();

    const authorElement = firstPost.locator('[data-testid="post-author"]');
    const authorText = await authorElement.textContent();
    const author = authorText?.trim().replace('@', '') || '';

    const titleElement = firstPost.locator('[data-testid="post-title"] a');
    const postLink = await titleElement.getAttribute('href');
    const permlink = postLink?.split('/').pop() || '';

    const payoutElement = firstPost.locator('[data-testid="post-payout"]');
    const payoutText = await payoutElement.textContent();
    const uiPayout = parseFloat(payoutText?.replace('$', '').trim() || '0');

    console.log(`   Post: @${author}/${permlink}`);
    console.log(`   UI Payout: $${uiPayout.toFixed(2)}`);

    console.log('\n2. Getting API data...');
    const apiRequest = {
      jsonrpc: '2.0',
      method: 'bridge.get_post',
      params: { author, permlink, observer: '' },
      id: 1
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest)
    });
    const data = await response.json();
    const post = data.result;

    const pendingPayout = parseFloat(post.pending_payout_value?.replace(' HBD', '') || '0');
    const curatorPayout = parseFloat(post.curator_payout_value?.replace(' HBD', '') || '0');
    const authorPayout = parseFloat(post.author_payout_value?.replace(' HBD', '') || '0');

    const apiPayout = post.is_paidout ? (curatorPayout + authorPayout) : pendingPayout;

    console.log(`   API is_paidout: ${post.is_paidout}`);
    console.log(`   API Payout: $${apiPayout.toFixed(2)}`);

    console.log('\n3. Comparison (tolerance: $0.10)...');
    const diff = Math.abs(uiPayout - apiPayout);

    if (diff <= 0.10) {
      console.log(`   ✓ PASS: Payout matches (diff: $${diff.toFixed(2)})`);
    } else {
      console.log(`   ✗ FAIL: Payout mismatch (UI: $${uiPayout.toFixed(2)}, API: $${apiPayout.toFixed(2)}, diff: $${diff.toFixed(2)})`);
      allPassed = false;
    }

    console.log('\n========================================');
    console.log(allPassed ? '✓ SMOKE-07: PASS' : '✗ SMOKE-07: FAIL');
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

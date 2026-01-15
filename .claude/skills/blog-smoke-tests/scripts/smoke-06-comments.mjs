/**
 * SMOKE-06: Comments
 * Priority: P1 (Important)
 * Verifies comment count on card matches API
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-06: Comments');
  console.log('========================================\n');

  const headless = process.env.HEADLESS === 'true';
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    let allPassed = true;

    console.log('1. Opening /trending...');
    await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    const posts = page.locator('[data-testid="post-list-item"]');
    let selectedPost = null;
    let cardCommentsCount = 0;
    let author = '';
    let permlink = '';

    console.log('   Finding post with comments...');
    for (let i = 0; i < 5; i++) {
      const post = posts.nth(i);
      const responseLink = post.locator('[data-testid="post-card-response-link"]');
      const responseText = await responseLink.textContent();
      const count = parseInt(responseText?.replace(/[^\d]/g, '') || '0');

      if (count > 0) {
        selectedPost = post;
        cardCommentsCount = count;

        const authorElement = post.locator('[data-testid="post-author"]');
        const authorText = await authorElement.textContent();
        author = authorText?.trim().replace('@', '') || '';

        const titleElement = post.locator('[data-testid="post-title"] a');
        const postLink = await titleElement.getAttribute('href');
        permlink = postLink?.split('/').pop() || '';

        console.log(`   Found: @${author}/${permlink}`);
        console.log(`   Card comments: ${cardCommentsCount}`);
        break;
      }
    }

    if (!selectedPost) {
      console.log('   No post with comments found in top 5');
      console.log('\n========================================');
      console.log('✓ SMOKE-06: SKIP (no posts with comments)');
      console.log('========================================');
      await browser.close();
      return true;
    }

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
    const apiChildren = data.result.children || 0;
    console.log(`   API children: ${apiChildren}`);

    console.log('\n3. Comparison...');
    const diff = Math.abs(cardCommentsCount - apiChildren);

    if (diff <= 5) {
      console.log(`   ✓ PASS: Comments match (card: ${cardCommentsCount}, API: ${apiChildren}, diff: ${diff})`);
    } else {
      console.log(`   ✗ FAIL: Comments mismatch (card: ${cardCommentsCount}, API: ${apiChildren}, diff: ${diff})`);
      allPassed = false;
    }

    console.log('\n========================================');
    console.log(allPassed ? '✓ SMOKE-06: PASS' : '✗ SMOKE-06: FAIL');
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

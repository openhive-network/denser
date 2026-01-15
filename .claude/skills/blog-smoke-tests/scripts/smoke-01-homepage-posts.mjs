/**
 * SMOKE-01: Homepage Posts
 * Priority: P0 (Critical)
 * Verifies /trending loads with >=20 posts and first post matches API
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-01: Homepage Posts');
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
    const postCount = await posts.count();
    console.log(`   Posts found: ${postCount}`);

    if (postCount >= 20) {
      console.log('   ✓ PASS: >= 20 posts\n');
    } else {
      console.log('   ✗ FAIL: < 20 posts\n');
      allPassed = false;
    }

    console.log('2. Getting first post from UI...');
    const firstPost = posts.first();
    const authorElement = firstPost.locator('[data-testid="post-author"]');
    const authorText = await authorElement.textContent();
    const uiAuthor = authorText?.trim().replace('@', '') || '';

    const titleElement = firstPost.locator('[data-testid="post-title"] a');
    const postLink = await titleElement.getAttribute('href');
    const uiPermlink = postLink?.split('/').pop() || '';

    console.log(`   UI Author: @${uiAuthor}`);
    console.log(`   UI Permlink: ${uiPermlink}\n`);

    console.log('3. Getting data from API...');
    const apiRequest = {
      jsonrpc: '2.0',
      method: 'bridge.get_ranked_posts',
      params: { sort: 'trending', tag: '', observer: '', limit: 20 },
      id: 1
    };
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequest)
    });
    const data = await response.json();
    const apiFirstPost = data.result[0];

    console.log(`   API Author: @${apiFirstPost.author}`);
    console.log(`   API Permlink: ${apiFirstPost.permlink}\n`);

    console.log('4. Comparison...');
    if (uiAuthor === apiFirstPost.author) {
      console.log('   ✓ PASS: Author matches');
    } else {
      console.log(`   ✗ FAIL: Author mismatch`);
      allPassed = false;
    }

    if (uiPermlink === apiFirstPost.permlink) {
      console.log('   ✓ PASS: Permlink matches');
    } else {
      console.log(`   ✗ FAIL: Permlink mismatch`);
      allPassed = false;
    }

    console.log('\n========================================');
    console.log(allPassed ? '✓ SMOKE-01: PASS' : '✗ SMOKE-01: FAIL');
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

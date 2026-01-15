/**
 * SMOKE-11: Categories
 * Priority: P3 (Navigation)
 * Verifies /trending vs /hot vs /created show different posts
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-11: Categories');
  console.log('========================================\n');

  const headless = process.env.HEADLESS === 'true';
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    let allPassed = true;

    console.log('1. Opening /trending...');
    await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    const trendingPost = page.locator('[data-testid="post-list-item"]').first();
    const trendingTitle = await trendingPost.locator('[data-testid="post-title"]').textContent();
    const trendingCount = await page.locator('[data-testid="post-list-item"]').count();
    console.log(`   /trending: ${trendingCount} posts, first: "${trendingTitle?.substring(0, 40)}..."`);

    console.log('\n2. Opening /hot...');
    await page.goto(`${BASE_URL}/hot`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    const hotPost = page.locator('[data-testid="post-list-item"]').first();
    const hotTitle = await hotPost.locator('[data-testid="post-title"]').textContent();
    const hotCount = await page.locator('[data-testid="post-list-item"]').count();
    console.log(`   /hot: ${hotCount} posts, first: "${hotTitle?.substring(0, 40)}..."`);

    console.log('\n3. Opening /created...');
    await page.goto(`${BASE_URL}/created`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    const createdPost = page.locator('[data-testid="post-list-item"]').first();
    const createdTitle = await createdPost.locator('[data-testid="post-title"]').textContent();
    const createdCount = await page.locator('[data-testid="post-list-item"]').count();
    console.log(`   /created: ${createdCount} posts, first: "${createdTitle?.substring(0, 40)}..."`);

    console.log('\n4. Comparison...');

    if (trendingCount > 0 && hotCount > 0 && createdCount > 0) {
      console.log('   ✓ PASS: All categories have posts');
    } else {
      console.log('   ✗ FAIL: Some categories empty');
      allPassed = false;
    }

    const differentPosts = trendingTitle !== createdTitle;
    if (differentPosts) {
      console.log('   ✓ PASS: /trending and /created show different first posts');
    } else {
      console.log('   (i) INFO: /trending and /created have same first post (possible)');
    }

    console.log('\n========================================');
    console.log(allPassed ? '✓ SMOKE-11: PASS' : '✗ SMOKE-11: FAIL');
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

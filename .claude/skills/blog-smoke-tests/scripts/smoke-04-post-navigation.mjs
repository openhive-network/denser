/**
 * SMOKE-04: Post Navigation
 * Priority: P0 (Critical)
 * Verifies clicking post navigates to page with title, content, footer
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-04: Post Navigation');
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
    const titleElement = firstPost.locator('[data-testid="post-title"] a');
    const expectedTitle = await titleElement.textContent();
    console.log(`   Post title: ${expectedTitle?.substring(0, 50)}...\n`);

    console.log('2. Clicking post...');
    await titleElement.click();
    await page.waitForURL('**/@*/**', { timeout: 30000 });
    await page.locator('#articleBody').first().waitFor({ state: 'visible', timeout: 30000 });
    console.log(`   URL: ${page.url()}\n`);

    console.log('3. Checking page elements...');

    const articleTitle = page.locator('[data-testid="article-title"]');
    if (await articleTitle.isVisible()) {
      console.log('   ✓ PASS: Title visible');
    } else {
      console.log('   ✗ FAIL: Title not visible');
      allPassed = false;
    }

    const articleBody = page.locator('#articleBody').first();
    if (await articleBody.isVisible()) {
      console.log('   ✓ PASS: Content visible');
    } else {
      console.log('   ✗ FAIL: Content not visible');
      allPassed = false;
    }

    const commentVotes = page.locator('[data-testid="comment-votes"]').first();
    if (await commentVotes.isVisible()) {
      console.log('   ✓ PASS: Votes visible');
    } else {
      console.log('   ✗ FAIL: Votes not visible');
      allPassed = false;
    }

    const upvoteButton = page.locator('[data-testid="upvote-button"]').first();
    if (await upvoteButton.isVisible()) {
      console.log('   ✓ PASS: Upvote button visible');
    } else {
      console.log('   ✗ FAIL: Upvote button not visible');
      allPassed = false;
    }

    console.log('\n========================================');
    console.log(allPassed ? '✓ SMOKE-04: PASS' : '✗ SMOKE-04: FAIL');
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

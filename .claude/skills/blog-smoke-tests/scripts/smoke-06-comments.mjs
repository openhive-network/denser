/**
 * SMOKE-06: Comments
 * Priority: P1 (Important)
 * Verifies comments count on card matches API
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';
const TEST_ID = 'SMOKE-06';
const TEST_NAME = 'Comments';
const TEST_PRIORITY = 'P1';

async function runTest() {
  console.log('========================================');
  console.log(`${TEST_ID}: ${TEST_NAME}`);
  console.log('========================================\n');

  const headless = process.env.HEADLESS === 'true';
  const reportDir = process.env.REPORT_DIR || './playwright/temp_ai_report_tests';

  await mkdir(reportDir, { recursive: true });

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  let allPassed = true;
  let errorMessage = null;

  try {
    console.log('1. Opening /trending...');
    await page.goto(`${BASE_URL}/trending`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="post-list-item"]').first().waitFor({ state: 'visible', timeout: 30000 });

    console.log('   Finding post with comments...');

    const posts = page.locator('[data-testid="post-list-item"]');
    const postCount = await posts.count();

    let author = '';
    let permlink = '';
    let cardComments = 0;

    for (let i = 0; i < Math.min(postCount, 5); i++) {
      const post = posts.nth(i);
      const commentsElement = post.locator('[data-testid="post-comments"]');
      const commentsVisible = await commentsElement.isVisible().catch(() => false);

      if (commentsVisible) {
        const commentsText = await commentsElement.textContent();
        const count = parseInt(commentsText?.replace(/[^0-9]/g, '') || '0', 10);

        if (count > 0) {
          const authorElement = post.locator('[data-testid="post-author"]');
          const authorText = await authorElement.textContent();
          author = authorText?.trim().replace('@', '') || '';

          const titleElement = post.locator('[data-testid="post-title"] a');
          const postLink = await titleElement.getAttribute('href');
          permlink = postLink?.split('/').pop() || '';

          cardComments = count;
          break;
        }
      }
    }

    if (author && permlink) {
      console.log(`   Found: @${author}/${permlink}`);
      console.log(`   Card comments: ${cardComments}`);

      console.log('\n2. Getting API data...');
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
      const apiPost = data.result.find(p => p.author === author && p.permlink === permlink);
      const apiComments = apiPost?.children || 0;

      console.log(`   API children: ${apiComments}`);

      console.log('\n3. Comparison...');
      const diff = Math.abs(cardComments - apiComments);

      if (diff <= 2) {
        console.log(`   ✓ PASS: Comments match (card: ${cardComments}, API: ${apiComments}, diff: ${diff})`);
      } else {
        console.log(`   ✗ FAIL: Comments mismatch (card: ${cardComments}, API: ${apiComments}, diff: ${diff})`);
        allPassed = false;
      }
    } else {
      console.log('   ✗ FAIL: No post with comments found');
      allPassed = false;
    }

  } catch (error) {
    console.error('✗ ERROR:', error.message);
    errorMessage = error.message;
    allPassed = false;
  }

  if (!allPassed) {
    const screenshotPath = join(reportDir, `${TEST_ID}-failure.png`);
    const tracePath = join(reportDir, `${TEST_ID}-trace.zip`);

    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   Screenshot saved: ${screenshotPath}`);
    } catch (e) {
      console.log(`   Could not save screenshot: ${e.message}`);
    }

    await context.tracing.stop({ path: tracePath });
    console.log(`   Trace saved: ${tracePath}`);
  } else {
    await context.tracing.stop();
  }

  await browser.close();

  console.log('\n========================================');
  console.log(allPassed ? `✓ ${TEST_ID}: PASS` : `✗ ${TEST_ID}: FAIL`);
  console.log('========================================');

  const result = {
    id: TEST_ID,
    name: TEST_NAME,
    priority: TEST_PRIORITY,
    passed: allPassed,
    error: errorMessage,
    artifacts: allPassed ? [] : [`${TEST_ID}-failure.png`, `${TEST_ID}-trace.zip`]
  };
  console.log('\n__RESULT__' + JSON.stringify(result));

  return allPassed;
}

runTest().then(passed => process.exit(passed ? 0 : 1));

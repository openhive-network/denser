/**
 * SMOKE-05: Votes API
 * Priority: P1 (Important)
 * Verifies vote count on card matches page and API
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-05: Votes API');
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

    const cardVotesElement = firstPost.locator('[data-testid="post-total-votes"]');
    const cardVotesText = await cardVotesElement.textContent();
    const cardVotes = parseInt(cardVotesText?.replace(/[^\d]/g, '') || '0');

    console.log(`   Post: @${author}/${permlink}`);
    console.log(`   Card votes: ${cardVotes}`);

    console.log('\n2. Navigating to post page...');
    await titleElement.click();
    await page.waitForURL('**/@*/**', { timeout: 30000 });
    await page.locator('#articleBody').first().waitFor({ state: 'visible', timeout: 30000 });

    const postFooter = page.locator('[data-testid="author-data-post-footer"]');
    const votesElement = postFooter.locator('[data-testid="comment-votes"]');
    await votesElement.scrollIntoViewIfNeeded();
    const votesText = await votesElement.textContent();
    const pageVotes = parseInt(votesText?.replace(/[^\d]/g, '') || '0');

    console.log(`   Page votes: ${pageVotes}`);

    console.log('\n3. Getting API data...');
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
    const activeVotes = data.result.active_votes || [];
    const apiVotes = activeVotes.length;

    console.log(`   API active_votes: ${apiVotes}`);
    console.log(`   (API limit: 1000)`);

    console.log('\n4. Comparison...');

    if (cardVotes === pageVotes) {
      console.log(`   ✓ PASS: Card = Page (${cardVotes})`);
    } else {
      console.log(`   ✗ FAIL: Card (${cardVotes}) != Page (${pageVotes})`);
      allPassed = false;
    }

    if (apiVotes >= 1000) {
      if (pageVotes >= apiVotes) {
        console.log(`   ✓ PASS: UI (${pageVotes}) >= API limit (${apiVotes})`);
      } else {
        console.log(`   ✗ FAIL: UI (${pageVotes}) < API (${apiVotes})`);
        allPassed = false;
      }
    } else {
      const diff = Math.abs(pageVotes - apiVotes);
      if (diff <= 10) {
        console.log(`   ✓ PASS: UI vs API (diff: ${diff})`);
      } else {
        console.log(`   ✗ FAIL: UI vs API diff: ${diff}`);
        allPassed = false;
      }
    }

    console.log('\n========================================');
    console.log(allPassed ? '✓ SMOKE-05: PASS' : '✗ SMOKE-05: FAIL');
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

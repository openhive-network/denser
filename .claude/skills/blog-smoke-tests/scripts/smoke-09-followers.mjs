/**
 * SMOKE-09: Followers/Following
 * Priority: P2 (Content)
 * Verifies followers/following counts match API
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';
const TEST_USER = 'gtg';
const TEST_ID = 'SMOKE-09';
const TEST_NAME = 'Followers/Following';
const TEST_PRIORITY = 'P2';

async function runTest() {
  console.log('========================================');
  console.log(`${TEST_ID}: ${TEST_NAME} @${TEST_USER}`);
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
    console.log(`1. Opening /@${TEST_USER}...`);
    await page.goto(`${BASE_URL}/@${TEST_USER}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    console.log('\n2. Getting UI stats...');

    const statsElements = page.locator('[class*="flex"] span, [class*="stat"] span').filter({ hasText: /\d/ });
    const statsCount = await statsElements.count();

    const uiStats = [];
    for (let i = 0; i < Math.min(statsCount, 10); i++) {
      const text = await statsElements.nth(i).textContent();
      if (text && /[\d,]+/.test(text)) {
        const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
        if (num > 0) {
          uiStats.push({ text, num });
        }
      }
    }

    const followersElement = page.locator('[data-testid="user-followers"]');
    const postsElement = page.locator('[data-testid="user-post-count"]');
    const followingElement = page.locator('[data-testid="user-following"]');

    const followersText = await followersElement.textContent().catch(() => '0');
    const postsText = await postsElement.textContent().catch(() => '0');
    const followingText = await followingElement.textContent().catch(() => '0');

    const uiFollowers = parseInt(followersText?.replace(/[^0-9]/g, '') || '0', 10);
    const uiPosts = parseInt(postsText?.replace(/[^0-9]/g, '') || '0', 10);
    const uiFollowing = parseInt(followingText?.replace(/[^0-9]/g, '') || '0', 10);

    console.log(`   Stat 0: ${uiFollowers} followers`);
    console.log(`   Stat 1: ${uiPosts} posts`);
    console.log(`   Stat 2:  ${uiFollowing} following`);

    if (uiStats.length > 3) {
      console.log(`   Stat 3: ${uiStats[3]?.text || 'N/A'}`);
    }

    console.log('\n3. Getting API stats...');

    const followCountRequest = {
      jsonrpc: '2.0',
      method: 'condenser_api.get_follow_count',
      params: [TEST_USER],
      id: 1
    };
    const followResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(followCountRequest)
    });
    const followData = await followResponse.json();

    const apiFollowers = followData.result?.follower_count || 0;
    const apiFollowing = followData.result?.following_count || 0;

    const accountRequest = {
      jsonrpc: '2.0',
      method: 'condenser_api.get_accounts',
      params: [[TEST_USER]],
      id: 2
    };
    const accountResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountRequest)
    });
    const accountData = await accountResponse.json();
    const apiPosts = accountData.result?.[0]?.post_count || 0;

    console.log(`   API Followers: ${apiFollowers}`);
    console.log(`   API Posts: ${apiPosts}`);
    console.log(`   API Following: ${apiFollowing}`);

    console.log('\n4. Comparison UI vs API...');

    const followersDiff = Math.abs(uiFollowers - apiFollowers);
    if (followersDiff <= 50) {
      console.log(`   ✓ PASS: Followers UI:${uiFollowers} API:${apiFollowers} (diff:${followersDiff})`);
    } else {
      console.log(`   ✗ FAIL: Followers UI:${uiFollowers} API:${apiFollowers} (diff:${followersDiff})`);
      allPassed = false;
    }

    const postsDiff = Math.abs(uiPosts - apiPosts);
    if (postsDiff <= 50) {
      console.log(`   ✓ PASS: Posts UI:${uiPosts} API:${apiPosts} (diff:${postsDiff})`);
    } else {
      console.log(`   ✗ FAIL: Posts UI:${uiPosts} API:${apiPosts} (diff:${postsDiff})`);
      allPassed = false;
    }

    const followingDiff = Math.abs(uiFollowing - apiFollowing);
    if (followingDiff <= 50) {
      console.log(`   ✓ PASS: Following UI:${uiFollowing} API:${apiFollowing} (diff:${followingDiff})`);
    } else {
      console.log(`   ✗ FAIL: Following UI:${uiFollowing} API:${apiFollowing} (diff:${followingDiff})`);
      allPassed = false;
    }

    if (uiStats.length >= 4) {
      console.log(`   ✓ PASS: All 4 stats displayed`);
    } else {
      console.log(`   (i) INFO: Only ${uiStats.length} stats found`);
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

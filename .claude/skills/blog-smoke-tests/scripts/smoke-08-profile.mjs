/**
 * SMOKE-08: User Profile
 * Priority: P0 (Critical)
 * Verifies profile page shows correct stats from API
 */
import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';
const TEST_USER = 'gtg';
const TEST_ID = 'SMOKE-08';
const TEST_NAME = 'User Profile';
const TEST_PRIORITY = 'P0';

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

    // Profile stats are in ul[data-testid="profile-stats"] with li children
    const profileStats = page.locator('[data-testid="profile-stats"]');
    await profileStats.waitFor({ state: 'visible', timeout: 10000 });

    const statsItems = profileStats.locator('li');
    const statsCount = await statsItems.count();

    let uiFollowers = 0;
    let uiPosts = 0;
    let uiFollowing = 0;

    for (let i = 0; i < statsCount; i++) {
      const itemText = await statsItems.nth(i).textContent();
      const text = itemText?.toLowerCase() || '';
      const numMatch = itemText?.match(/[\d,]+/);
      const num = numMatch ? parseInt(numMatch[0].replace(/,/g, ''), 10) : 0;

      if (text.includes('follower')) {
        uiFollowers = num;
      } else if (text.includes('post')) {
        uiPosts = num;
      } else if (text.includes('follow')) {
        uiFollowing = num;
      }
    }

    console.log(`   Followers: ${uiFollowers}`);
    console.log(`   Posts: ${uiPosts}`);
    console.log(`   Following: ${uiFollowing}`);

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

    const postsRequest = {
      jsonrpc: '2.0',
      method: 'bridge.get_account_posts',
      params: { sort: 'posts', account: TEST_USER, limit: 1 },
      id: 2
    };
    const postsResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postsRequest)
    });
    const postsData = await postsResponse.json();

    const accountRequest = {
      jsonrpc: '2.0',
      method: 'condenser_api.get_accounts',
      params: [[TEST_USER]],
      id: 3
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

    console.log('\n4. Comparison (tolerance: +-50)...');

    const followersDiff = Math.abs(uiFollowers - apiFollowers);
    if (followersDiff <= 50) {
      console.log(`   ✓ PASS: Followers (diff: ${followersDiff})`);
    } else {
      console.log(`   ✗ FAIL: Followers (UI: ${uiFollowers}, API: ${apiFollowers}, diff: ${followersDiff})`);
      allPassed = false;
    }

    const postsDiff = Math.abs(uiPosts - apiPosts);
    if (postsDiff <= 50) {
      console.log(`   ✓ PASS: Posts (diff: ${postsDiff})`);
    } else {
      console.log(`   ✗ FAIL: Posts (UI: ${uiPosts}, API: ${apiPosts}, diff: ${postsDiff})`);
      allPassed = false;
    }

    const followingDiff = Math.abs(uiFollowing - apiFollowing);
    if (followingDiff <= 50) {
      console.log(`   ✓ PASS: Following (diff: ${followingDiff})`);
    } else {
      console.log(`   ✗ FAIL: Following (UI: ${uiFollowing}, API: ${apiFollowing}, diff: ${followingDiff})`);
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

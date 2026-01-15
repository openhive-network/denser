/**
 * SMOKE-08: User Profile
 * Priority: P0 (Critical)
 * Verifies profile stats for @gtg match API
 */
import { chromium } from 'playwright';

const BASE_URL = 'https://blog.openhive.network';
const API_URL = 'https://api.hive.blog';
const TEST_USER = 'gtg';

async function runTest() {
  console.log('========================================');
  console.log('SMOKE-08: User Profile @gtg');
  console.log('========================================\n');

  const headless = process.env.HEADLESS === 'true';
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage();

  try {
    let allPassed = true;

    console.log(`1. Opening /@${TEST_USER}...`);
    await page.goto(`${BASE_URL}/@${TEST_USER}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.locator('[data-testid="profile-stats"]').waitFor({ state: 'visible', timeout: 30000 });

    console.log('\n2. Getting UI stats...');
    const profileStats = page.locator('[data-testid="profile-stats"]');
    const statsItems = profileStats.locator('li');

    const followersText = await statsItems.nth(0).textContent();
    const postsText = await statsItems.nth(1).textContent();
    const followingText = await statsItems.nth(2).textContent();

    const uiFollowers = parseInt(followersText?.replace(/[^\d]/g, '') || '0');
    const uiPosts = parseInt(postsText?.replace(/[^\d]/g, '') || '0');
    const uiFollowing = parseInt(followingText?.replace(/[^\d]/g, '') || '0');

    console.log(`   Followers: ${uiFollowers}`);
    console.log(`   Posts: ${uiPosts}`);
    console.log(`   Following: ${uiFollowing}`);

    console.log('\n3. Getting API stats...');
    const followRequest = {
      jsonrpc: '2.0',
      method: 'condenser_api.get_follow_count',
      params: [TEST_USER],
      id: 1
    };
    const followResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(followRequest)
    });
    const followData = await followResponse.json();
    const apiFollowers = followData.result.follower_count;
    const apiFollowing = followData.result.following_count;

    const accountRequest = {
      jsonrpc: '2.0',
      method: 'condenser_api.get_accounts',
      params: [[TEST_USER]],
      id: 1
    };
    const accountResponse = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(accountRequest)
    });
    const accountData = await accountResponse.json();
    const apiPosts = accountData.result[0].post_count;

    console.log(`   API Followers: ${apiFollowers}`);
    console.log(`   API Posts: ${apiPosts}`);
    console.log(`   API Following: ${apiFollowing}`);

    console.log('\n4. Comparison (tolerance: +-50)...');

    const followersDiff = Math.abs(uiFollowers - apiFollowers);
    if (followersDiff <= 50) {
      console.log(`   ✓ PASS: Followers (diff: ${followersDiff})`);
    } else {
      console.log(`   ✗ FAIL: Followers diff too large (${followersDiff})`);
      allPassed = false;
    }

    const postsDiff = Math.abs(uiPosts - apiPosts);
    if (postsDiff <= 10) {
      console.log(`   ✓ PASS: Posts (diff: ${postsDiff})`);
    } else {
      console.log(`   ✗ FAIL: Posts diff too large (${postsDiff})`);
      allPassed = false;
    }

    const followingDiff = Math.abs(uiFollowing - apiFollowing);
    if (followingDiff <= 50) {
      console.log(`   ✓ PASS: Following (diff: ${followingDiff})`);
    } else {
      console.log(`   ✗ FAIL: Following diff too large (${followingDiff})`);
      allPassed = false;
    }

    console.log('\n========================================');
    console.log(allPassed ? '✓ SMOKE-08: PASS' : '✗ SMOKE-08: FAIL');
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

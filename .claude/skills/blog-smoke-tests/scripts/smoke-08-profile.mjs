/**
 * SMOKE-08: User Profile
 * Priority: P0 (Critical)
 * Verifies profile page shows correct stats from API
 */
import {
  runSmokeTest,
  config,
  getUserProfile,
  getAccountInfo,
  parseInteger,
  SELECTORS,
  TIMEOUTS
} from './test-utils.mjs';

const TEST_ID = 'SMOKE-08';
const TEST_NAME = 'User Profile';
const TEST_PRIORITY = 'P0';

async function test({ page }) {
  let allPassed = true;
  const testUser = config.TEST_USER;

  console.log(`1. Opening /@${testUser}...`);
  await page.goto(`${config.BASE_URL}/@${testUser}`, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.NAVIGATION
  });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE });

  console.log('\n2. Getting UI stats...');
  const profileStats = page.locator(SELECTORS.PROFILE_STATS);
  await profileStats.waitFor({ state: 'visible', timeout: TIMEOUTS.SHORT });

  const statsItems = profileStats.locator('li');
  const statsCount = await statsItems.count();

  let uiFollowers = 0;
  let uiPosts = 0;
  let uiFollowing = 0;

  for (let i = 0; i < statsCount; i++) {
    const itemText = await statsItems.nth(i).textContent();
    const text = itemText?.toLowerCase() || '';
    const num = parseInteger(itemText?.match(/[\d,]+/)?.[0]?.replace(/,/g, ''));

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
  const profileData = await getUserProfile(testUser);
  const apiFollowers = profileData.result?.stats?.followers || 0;
  const apiFollowing = profileData.result?.stats?.following || 0;

  const accountData = await getAccountInfo(testUser);
  const apiPosts = accountData.result?.accounts?.[0]?.post_count || 0;

  console.log(`   API Followers: ${apiFollowers}`);
  console.log(`   API Posts: ${apiPosts}`);
  console.log(`   API Following: ${apiFollowing}`);

  console.log('\n4. Comparison (tolerance: +-50)...');
  const TOLERANCE = 50;

  const followersDiff = Math.abs(uiFollowers - apiFollowers);
  if (followersDiff <= TOLERANCE) {
    console.log(`   ✓ PASS: Followers (diff: ${followersDiff})`);
  } else {
    console.log(`   ✗ FAIL: Followers (UI: ${uiFollowers}, API: ${apiFollowers}, diff: ${followersDiff})`);
    allPassed = false;
  }

  const postsDiff = Math.abs(uiPosts - apiPosts);
  if (postsDiff <= TOLERANCE) {
    console.log(`   ✓ PASS: Posts (diff: ${postsDiff})`);
  } else {
    console.log(`   ✗ FAIL: Posts (UI: ${uiPosts}, API: ${apiPosts}, diff: ${postsDiff})`);
    allPassed = false;
  }

  const followingDiff = Math.abs(uiFollowing - apiFollowing);
  if (followingDiff <= TOLERANCE) {
    console.log(`   ✓ PASS: Following (diff: ${followingDiff})`);
  } else {
    console.log(`   ✗ FAIL: Following (UI: ${uiFollowing}, API: ${apiFollowing}, diff: ${followingDiff})`);
    allPassed = false;
  }

  return allPassed;
}

runSmokeTest({
  id: TEST_ID,
  name: TEST_NAME,
  priority: TEST_PRIORITY,
  headerSuffix: `@${config.TEST_USER}`
}, test).then(passed => process.exit(passed ? 0 : 1));

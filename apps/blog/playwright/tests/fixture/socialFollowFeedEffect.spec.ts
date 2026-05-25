import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { ProfilePage } from '../support/pages/profilePage';
import { TIMEOUTS } from '../support/constants';
import { FOLLOW_TARGET_USER, gotoProfileLoggedIn } from '../support/followMuteContext';

/**
 * §9.1 Follow cross-page propagation — FOL-PROP-01.
 *
 * Following a user causes their posts to surface in the seeded user's
 * `/created/my` "followed accounts" feed. Mechanism — Hive's API
 * resolves `bridge.get_ranked_posts(sort='created', tag='my', observer=<user>)`
 * server-side against the user's on-chain following list. Unlike the
 * blacklist or mute mutations, follow has no client-side optimistic
 * patch for the feed query (use-follow-mutations.ts only touches
 * profile / followers / followingData caches), so the post-follow
 * `/created/my` revisit relies entirely on a fresh server response.
 *
 * Fixture has TWO recorded entries for the same
 * `bridge.get_ranked_posts(my, guest4test)` key — the first
 * (recorded against the real chain at record time, hiveio NOT in the
 * 20 returned posts) and the second (hand-crafted with hiveio's first
 * post prepended). The proxy serves them in filename-sorted order via
 * its per-hash call counter (fixture-proxy.ts:592 — `entries[callIndex
 * % entries.length]`). Same dual-recording pattern as
 * `socialBlacklistPropagation` / BL-PROP-01.
 *
 * NB: the seeded `guest4test` account on-chain *already* follows some
 * accounts (the recording shows 20 unrelated posts), so the empty-feed
 * branch (`user_profile.empty_feed_not_following`) doesn't fire. The
 * baseline is "first post is NOT hiveio"; the assertion is "first post
 * IS hiveio" after follow.
 *
 * The follow broadcast itself is mocked, so the real chain stays
 * unchanged — record-mode would otherwise leave the second
 * `/created/my` call returning the same 20-post feed.
 */

const FOLLOW_FEED_PATH = '/created/my';

test.use({
  fixtureTestName: 'socialFollowFeedEffect',
  authenticatedUser: {}
});

test('FOL-PROP-01 — Following a user makes their posts appear in /created/my', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });

  // Step 1: /created/my pre-state — feed has 20 unrelated posts;
  // hiveio is NOT the first author.
  await page.goto(FOLLOW_FEED_PATH);
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
  const firstPostBaseline = page.getByTestId('post-list-item').first();
  await expect(firstPostBaseline).toBeVisible();
  await expect(firstPostBaseline.getByTestId('post-author')).not.toHaveText(
    FOLLOW_TARGET_USER
  );

  // Step 2: go to /@hiveio and follow.
  await gotoProfileLoggedIn(page);
  const profile = new ProfilePage(page);
  await expect(profile.followButton).toHaveText('Follow');
  await profile.followButton.click();
  await broadcast.waitForCount(1);
  await expect(profile.followButton).toHaveText('Unfollow');

  // Step 3: /created/my refetches and now serves the second-recorded
  // entry (populated with hiveio posts). First post-list-item's
  // author should be hiveio.
  await page.goto(FOLLOW_FEED_PATH);
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
  const firstPost = page.getByTestId('post-list-item').first();
  await expect(firstPost).toBeVisible();
  await expect(firstPost.getByTestId('post-author')).toHaveText(FOLLOW_TARGET_USER);
});

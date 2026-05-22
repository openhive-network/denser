import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { ProfilePage } from '../support/pages/profilePage';
import {
  FOLLOWER,
  FOLLOW_TARGET_USER,
  WHAT_FOLLOW,
  TOAST_FOLLOWED,
  gotoProfileLoggedIn
} from '../support/followMuteContext';

/**
 * §9.1 Follow — FOL-01 and FOL-03.
 *
 * FOL-01: follow user from profile.
 *   Wire — custom_json id="follow", what: ["blog"].
 *   Toast — "You are now following hiveio.".
 *   UI — button text flips "Follow" → "Unfollow".
 *
 * FOL-03: followers list shows the seeded user after the follow.
 *   useFollowMutation's onMutate optimistically prepends `guest4test`
 *   to `['followersData', 'hiveio']` if that cache entry already exists
 *   (use-follow-mutations.ts:122-130). It also bumps the visible
 *   `follower_count` on the cached profile (line 145-148). The visible
 *   follower count is the deterministic, navigation-free signal — we
 *   read it before and after the click. If the assertion ever needs to
 *   inspect the followers PAGE itself, switch to an overlay variant
 *   that reflects the post-follow state.
 */

test.use({
  fixtureTestName: 'socialFollow',
  authenticatedUser: {}
});

test('FOL-01 + FOL-03 — Follow user from profile; follower count updates', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoProfileLoggedIn(page);
  const profile = new ProfilePage(page);
  await expect(profile.followButton).toHaveText('Follow');

  // FOL-03 baseline: capture the pre-click follower count so we can
  // assert the optimistic +1 after the broadcast lands.
  const followersBeforeText = (await profile.profileFollowers.textContent()) ?? '';
  const followersBefore = parseInt(followersBeforeText.replace(/[^\d]/g, ''), 10);

  await profile.followButton.click();
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: FOLLOW_TARGET_USER,
    what: WHAT_FOLLOW
  });

  await expect(
    page.getByText(TOAST_FOLLOWED(FOLLOW_TARGET_USER), { exact: true })
  ).toBeVisible();
  await expect(profile.followButton).toHaveText('Unfollow');

  // FOL-03: follower count incremented by one — proves the optimistic
  // cache propagated through useFollowMutation.onMutate.
  await expect
    .poll(async () => {
      const text = (await profile.profileFollowers.textContent()) ?? '';
      return parseInt(text.replace(/[^\d]/g, ''), 10);
    })
    .toBe(followersBefore + 1);
});

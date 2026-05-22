import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { ProfilePage } from '../support/pages/profilePage';
import {
  FOLLOWER,
  FOLLOW_TARGET_USER,
  WHAT_UNMUTE,
  TOAST_UNMUTED,
  gotoProfileLoggedIn
} from '../support/followMuteContext';

/**
 * §9.2 Mute — MUTE-02: unmute a previously muted user from their profile.
 *
 * Uses overlay fixture dir `socialMute_muted` — generated from the
 * `socialMute` base by patching `bridge.get_following`/`bridge.get_profile`
 * so the seeded follower (`guest4test`) is already in the "ignore"
 * relation toward `hiveio`. The profile renders an "Unmute" button.
 *
 * Wire-form: wax aliases `unmuteBlog` to `unfollowBlog`, so the
 * payload is `["follow", { follower, following, what: [""] }]` —
 * single-string `following` (no rest args) and a 1-element `what`
 * holding the empty UNFOLLOW action.
 */

test.use({
  fixtureTestName: 'socialMute_muted',
  authenticatedUser: {}
});

test('MUTE-02 — Unmute user from profile', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoProfileLoggedIn(page);
  const profile = new ProfilePage(page);
  await expect(profile.muteButton).toHaveText('Unmute');

  await profile.muteButton.click();
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: FOLLOW_TARGET_USER,
    what: WHAT_UNMUTE
  });

  await expect(
    page.getByText(TOAST_UNMUTED(FOLLOW_TARGET_USER), { exact: true })
  ).toBeVisible();
  await expect(profile.muteButton).toHaveText('Mute');
});

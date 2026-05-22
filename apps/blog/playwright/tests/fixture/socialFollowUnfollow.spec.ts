import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { ProfilePage } from '../support/pages/profilePage';
import {
  FOLLOWER,
  FOLLOW_TARGET_USER,
  WHAT_UNFOLLOW,
  TOAST_UNFOLLOWED,
  gotoProfileLoggedIn
} from '../support/followMuteContext';

/**
 * §9.1 Follow — FOL-02: unfollow a user from their profile.
 *
 * Uses overlay fixture dir `socialFollow_followed` — the seeded user is
 * already in the "blog" relation toward `hiveio`. The profile header
 * renders the "Unfollow" button.
 *
 * Wire-form: unfollow clears the relation via the empty UNFOLLOW
 * action — `["follow", { follower, following: "hiveio", what: [""] }]`.
 * Single-string `following` since `transactionService.unfollow(name)`
 * passes no rest args to wax.
 */

test.use({
  fixtureTestName: 'socialFollow_followed',
  authenticatedUser: {}
});

test('FOL-02 — Unfollow user from profile', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoProfileLoggedIn(page);
  const profile = new ProfilePage(page);
  await expect(profile.followButton).toHaveText('Unfollow');

  await profile.followButton.click();
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: FOLLOW_TARGET_USER,
    what: WHAT_UNFOLLOW
  });

  await expect(
    page.getByText(TOAST_UNFOLLOWED(FOLLOW_TARGET_USER), { exact: true })
  ).toBeVisible();
  await expect(profile.followButton).toHaveText('Follow');
});

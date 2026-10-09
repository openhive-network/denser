import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { installFollowIndexSwap } from '../support/fixture-auth/follow-index-swap';
import { HomePage } from '../support/pages/homePage';
import { ProfilePage } from '../support/pages/profilePage';
import {
  FOLLOWER,
  FOLLOW_TARGET_USER,
  WHAT_FOLLOW,
  TOAST_FOLLOWED,
  gotoProfileLoggedIn
} from '../support/followMuteContext';

/**
 * §9.1 Follow — FOL-04: own "following" count and list after a follow.
 *
 * Follow hiveio, open the seeded user's own profile through the header
 * menu (client-side, so the React Query cache from the follow survives),
 * read "N following", click it, and check the count did not change and
 * hiveio is in the followed list.
 *
 * The replayed chain never moves, so `installFollowIndexSwap` adds hiveio
 * to the browser's `get_following` reads once the follow is broadcast —
 * the post-follow state a real node reports after indexing. SSR reads keep
 * the recording, like a lagging Hivemind node.
 *
 * Fixtures: `socialFollowOwnProfile` overlays `socialFollow` with the reads
 * of the seeded user's own profile and followed page (see its _index.json).
 */

test.use({
  fixtureTestName: 'socialFollowOwnProfile',
  authenticatedUser: {}
});

const parseCount = (text: string | null): number => parseInt((text ?? '').replace(/[^\d]/g, ''), 10);

test('FOL-04 — Own following count and list include a just-followed user', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await installFollowIndexSwap(page, broadcast, {
    follower: FOLLOWER,
    following: FOLLOW_TARGET_USER
  });
  await gotoProfileLoggedIn(page);
  const profile = new ProfilePage(page);
  await expect(profile.followButton).toHaveText('Follow');

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

  const home = new HomePage(page);
  await home.profileAvatarButton.click();
  await home.profileMenuProfileLink.click();
  await expect(page).toHaveURL(new RegExp(`/@${FOLLOWER}$`));
  await expect(profile.profileFollowing).toBeVisible();
  const followingBefore = parseCount(await profile.profileFollowing.textContent());
  expect(followingBefore).toBeGreaterThan(0);

  await profile.profileFollowing.click();
  await expect(page).toHaveURL(new RegExp(`/@${FOLLOWER}/followed$`));

  await expect(
    profile.followedListItems.getByRole('link', { name: FOLLOW_TARGET_USER, exact: true })
  ).toBeVisible();
  await expect(profile.followedListItems).toHaveCount(followingBefore);
  expect(parseCount(await profile.profileFollowing.textContent())).toBe(followingBefore);
});

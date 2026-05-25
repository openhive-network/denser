import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { UserListPage } from '../support/pages/userListPage';
import {
  FOLLOWER,
  BLACKLIST_TARGETS,
  WHAT_UNFOLLOW_BLACKLIST,
  WHAT_RESET_FOLLOW_BLACKLIST,
  RESET_FOLLOWING_TARGET,
  gotoOwnList
} from '../support/followMuteContext';

/**
 * §9.4 Followed Blacklists — FBL-02 (remove single) and FBL-04 (reset).
 *
 * Overlay fixture dir `socialFollowedBlacklistsPage_populated` —
 * `BLACKLIST_TARGETS` pre-loaded.
 *
 * Wire-form:
 *   unfollow_blacklist — what: ["unfollow_blacklist"]
 *   reset              — what: ["reset_follow_blacklist"]
 */

test.use({
  fixtureTestName: 'socialFollowedBlacklistsPage_populated',
  authenticatedUser: {}
});

test('FBL-02 — Remove account from followed blacklists via row button', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'followed_blacklists');
  const userList = new UserListPage(page);
  const target = BLACKLIST_TARGETS[0];
  await expect(userList.itemRow(target)).toBeVisible();

  await userList.removeButton(target).click();
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: target,
    what: WHAT_UNFOLLOW_BLACKLIST
  });

  await expect(userList.itemRow(target)).toHaveCount(0);
  await expect(userList.items).toHaveCount(BLACKLIST_TARGETS.length - 1);
});

test('FBL-04 — Reset followed blacklists with one broadcast', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'followed_blacklists');
  const userList = new UserListPage(page);
  await expect(userList.items).toHaveCount(BLACKLIST_TARGETS.length);

  await userList.resetButton('followed_blacklists').click();
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: RESET_FOLLOWING_TARGET,
    what: WHAT_RESET_FOLLOW_BLACKLIST
  });

  await expect(userList.emptyState).toBeVisible();
  await expect(userList.items).toHaveCount(0);
});

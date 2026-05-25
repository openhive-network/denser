import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { UserListPage } from '../support/pages/userListPage';
import {
  FOLLOWER,
  BLACKLIST_TARGETS,
  WHAT_UNFOLLOW_MUTED,
  WHAT_RESET_FOLLOW_MUTED,
  RESET_FOLLOWING_TARGET,
  gotoOwnList
} from '../support/followMuteContext';

/**
 * §9.5 Followed Muted Lists — FML-02 (remove single) and FML-04 (reset).
 *
 * Overlay fixture dir `socialFollowedMutedPage_populated` — pre-loaded.
 *
 * Wire-form:
 *   unfollow_muted — what: ["unfollow_muted"]
 *   reset          — what: ["reset_follow_muted_list"]
 */

test.use({
  fixtureTestName: 'socialFollowedMutedPage_populated',
  authenticatedUser: {}
});

test('FML-02 — Remove account from followed muted lists via row button', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'followed_muted_lists');
  const userList = new UserListPage(page);
  const target = BLACKLIST_TARGETS[0];
  await expect(userList.itemRow(target)).toBeVisible();

  await userList.removeButton(target).click();
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: target,
    what: WHAT_UNFOLLOW_MUTED
  });

  await expect(userList.itemRow(target)).toHaveCount(0);
  await expect(userList.items).toHaveCount(BLACKLIST_TARGETS.length - 1);
});

test('FML-04 — Reset followed muted lists with one broadcast', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'followed_muted_lists');
  const userList = new UserListPage(page);
  await expect(userList.items).toHaveCount(BLACKLIST_TARGETS.length);

  await userList.resetButton('followed_muted_lists').click();
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: RESET_FOLLOWING_TARGET,
    what: WHAT_RESET_FOLLOW_MUTED
  });

  await expect(userList.emptyState).toBeVisible();
  await expect(userList.items).toHaveCount(0);
});

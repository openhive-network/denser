import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { UserListPage } from '../support/pages/userListPage';
import {
  FOLLOWER,
  FOLLOW_TARGET_USER,
  BLACKLIST_TARGETS,
  WHAT_BLACKLIST,
  followingFromOtherBlogs,
  gotoOwnList
} from '../support/followMuteContext';

/**
 * §9.3 Blacklist — BL-01 (single add) and BL-03 (multi-add) from the
 * owner's `/lists/blacklisted` page. No profile-page entry point for
 * blacklist exists — all blacklist management happens here.
 *
 * Wire-form: `what: ["blacklist"]`.
 */

test.use({
  fixtureTestName: 'socialBlacklistListPage',
  authenticatedUser: {}
});

test('BL-01 — Add single account to blacklist from /lists/blacklisted', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'blacklisted');
  const userList = new UserListPage(page);
  await expect(userList.emptyState).toBeVisible();

  await userList.addAccount(FOLLOW_TARGET_USER);
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: followingFromOtherBlogs(FOLLOW_TARGET_USER),
    what: WHAT_BLACKLIST
  });

  await expect(userList.itemRow(FOLLOW_TARGET_USER)).toBeVisible();
  await expect(userList.emptyState).toBeHidden();
  await expect(userList.items).toHaveCount(1);
});

test('BL-03 — Add multiple accounts to blacklist (one broadcast each)', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'blacklisted');
  const userList = new UserListPage(page);

  for (const target of BLACKLIST_TARGETS) {
    await userList.addAccount(target);
  }
  await broadcast.waitForCount(BLACKLIST_TARGETS.length);

  for (let i = 0; i < BLACKLIST_TARGETS.length; i += 1) {
    expectFollowCustomJson(broadcast.calls[i], {
      follower: FOLLOWER,
      following: followingFromOtherBlogs(BLACKLIST_TARGETS[i]),
      what: WHAT_BLACKLIST
    });
  }

  for (const target of BLACKLIST_TARGETS) {
    await expect(userList.itemRow(target)).toBeVisible();
  }
  await expect(userList.items).toHaveCount(BLACKLIST_TARGETS.length);
});

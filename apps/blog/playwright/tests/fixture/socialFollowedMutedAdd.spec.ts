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
  WHAT_FOLLOW_MUTED,
  followingFromOtherBlogs,
  gotoOwnList
} from '../support/followMuteContext';

/**
 * §9.5 Followed Muted Lists — FML-01 (single add), FML-03 (multi-add).
 *
 * "Followed muted lists" are other accounts whose muted list the owner
 * has chosen to subscribe to. Management lives on
 * `/@<owner>/lists/followed_muted_lists`. Wire-form: `what: ["follow_muted"]`.
 */

test.use({
  fixtureTestName: 'socialFollowedMutedPage',
  authenticatedUser: {}
});

test('FML-01 — Add single account to followed muted lists', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'followed_muted_lists');
  const userList = new UserListPage(page);
  await expect(userList.emptyState).toBeVisible();

  await userList.addAccount(FOLLOW_TARGET_USER);
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: followingFromOtherBlogs(FOLLOW_TARGET_USER),
    what: WHAT_FOLLOW_MUTED
  });

  await expect(userList.itemRow(FOLLOW_TARGET_USER)).toBeVisible();
  await expect(userList.emptyState).toBeHidden();
  await expect(userList.items).toHaveCount(1);
});

test('FML-03 — Add multiple accounts to followed muted lists', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'followed_muted_lists');
  const userList = new UserListPage(page);

  for (const target of BLACKLIST_TARGETS) {
    await userList.addAccount(target);
  }
  await broadcast.waitForCount(BLACKLIST_TARGETS.length);

  for (let i = 0; i < BLACKLIST_TARGETS.length; i += 1) {
    expectFollowCustomJson(broadcast.calls[i], {
      follower: FOLLOWER,
      following: followingFromOtherBlogs(BLACKLIST_TARGETS[i]),
      what: WHAT_FOLLOW_MUTED
    });
  }

  for (const target of BLACKLIST_TARGETS) {
    await expect(userList.itemRow(target)).toBeVisible();
  }
  await expect(userList.items).toHaveCount(BLACKLIST_TARGETS.length);
});

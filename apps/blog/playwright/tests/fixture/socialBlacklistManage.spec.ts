import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { UserListPage } from '../support/pages/userListPage';
import {
  FOLLOWER,
  BLACKLIST_TARGETS,
  WHAT_UNBLACKLIST,
  WHAT_RESET_BLACKLIST,
  RESET_FOLLOWING_TARGET,
  gotoOwnList
} from '../support/followMuteContext';

/**
 * §9.3 Blacklist — BL-02 (remove single) and BL-04 (reset all).
 *
 * Overlay fixture dir `socialBlacklistListPage_populated` pre-loads
 * `BLACKLIST_TARGETS` into the blacklist so each row's "Unblacklist"
 * button is present and the per-list reset button is exercisable.
 *
 * Wire-form:
 *   unblacklist  — what: ["unblacklist"]
 *   reset list   — what: ["reset_blacklist"]
 */

test.use({
  fixtureTestName: 'socialBlacklistListPage_populated',
  authenticatedUser: {}
});

test('BL-02 — Remove account from blacklist via row button', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'blacklisted');
  const userList = new UserListPage(page);
  const target = BLACKLIST_TARGETS[0];
  await expect(userList.itemRow(target)).toBeVisible();

  await userList.removeButton(target).click();
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: target,
    what: WHAT_UNBLACKLIST
  });

  await expect(userList.itemRow(target)).toHaveCount(0);
  // Removing one leaves the rest; the optimistic cache drop in
  // useUnblacklistBlogMutation.onSettled is the only source of truth
  // here, so this is the assertion that catches a stale list re-render.
  await expect(userList.items).toHaveCount(BLACKLIST_TARGETS.length - 1);
});

test('BL-04 — Reset blacklist clears all entries with one broadcast', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'blacklisted');
  const userList = new UserListPage(page);
  await expect(userList.items).toHaveCount(BLACKLIST_TARGETS.length);

  await userList.resetButton('blacklisted').click();
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: RESET_FOLLOWING_TARGET,
    what: WHAT_RESET_BLACKLIST
  });

  await expect(userList.emptyState).toBeVisible();
  await expect(userList.items).toHaveCount(0);
});

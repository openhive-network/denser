import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { UserListPage } from '../support/pages/userListPage';
import {
  FOLLOWER,
  BLACKLIST_TARGETS,
  WHAT_RESET_MUTED_LIST,
  TOAST_RESET_BLOG_LIST,
  RESET_FOLLOWING_TARGET,
  gotoOwnList
} from '../support/followMuteContext';

/**
 * §9.2 Mute — MUTE-05: reset the entire muted list.
 *
 * Uses overlay fixture dir `socialMutedListPage_populated` — generator
 * pre-loads `BLACKLIST_TARGETS` into the muted list. Click "Reset Muted
 * Lists" → one broadcast with `what: ["reset_muted_list"]` (a single
 * custom_json that clears the whole list) → list collapses to the
 * empty state (useResetBlogListMutation.onSettled sets the cache to
 * `[]`, use-mute-mutations.ts:217).
 */

test.use({
  fixtureTestName: 'socialMutedListPage_populated',
  authenticatedUser: {}
});

test('MUTE-05 — Reset muted list clears all entries with one broadcast', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'muted');
  const userList = new UserListPage(page);
  await expect(userList.items).toHaveCount(BLACKLIST_TARGETS.length);

  await userList.resetButton('muted').click();
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    // Reset wrappers in transactionService pin `blog='all'`, no rest
    // args → wax emits `following: 'all'` (single string).
    following: RESET_FOLLOWING_TARGET,
    what: WHAT_RESET_MUTED_LIST
  });

  await expect(
    page.getByText(TOAST_RESET_BLOG_LIST, { exact: true })
  ).toBeVisible();
  await expect(userList.emptyState).toBeVisible();
  await expect(userList.items).toHaveCount(0);
});

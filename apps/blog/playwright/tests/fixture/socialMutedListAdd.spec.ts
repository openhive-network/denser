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
  WHAT_MUTE,
  followingFromOtherBlogs,
  gotoOwnList
} from '../support/followMuteContext';

/**
 * §9.2 Mute — MUTE-03 and MUTE-04: add accounts to the muted list
 * from the owner's `/lists/muted` management page.
 *
 * Base state: `guest4test` has an EMPTY muted list, so the list area
 * renders the empty-state row and the "Add account to list" controls
 * (`features/account-lists/list-area.tsx:170-209`). The Add submit
 * button only mounts after the input is filled — Playwright's auto-
 * wait inside the `UserListPage.addAccount(name)` helper handles that.
 *
 * Each Add click triggers one custom_json broadcast with `what: ["ignore"]`
 * and a single `following` value (the typed username) — wax splits
 * `transactionService.mute(name, '', ...)` into a one-element rest arg.
 */

test.use({
  fixtureTestName: 'socialMutedListPage',
  authenticatedUser: {}
});

test('MUTE-03 — Add single account to muted list from /lists/muted', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'muted');
  const userList = new UserListPage(page);
  await expect(userList.emptyState).toBeVisible();

  await userList.addAccount(FOLLOW_TARGET_USER);
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: followingFromOtherBlogs(FOLLOW_TARGET_USER),
    what: WHAT_MUTE
  });

  // Optimistic update in useMuteMutation.onMutate prepends the entry
  // to ['muted', guest4test] (use-mute-mutations.ts:22-32), so the row
  // is visible immediately after the click — no wait on broadcast.
  await expect(userList.itemRow(FOLLOW_TARGET_USER)).toBeVisible();
  // Empty-state disappears and the list now has exactly one row — the
  // ListArea re-renders from the patched query cache, not a refetch.
  await expect(userList.emptyState).toBeHidden();
  await expect(userList.items).toHaveCount(1);
});

test('MUTE-04 — Add multiple accounts from /lists/muted (one broadcast each)', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'muted');
  const userList = new UserListPage(page);

  for (const target of BLACKLIST_TARGETS) {
    await userList.addAccount(target);
  }
  await broadcast.waitForCount(BLACKLIST_TARGETS.length);

  // One broadcast per Add click — each carries a single target with
  // what: ["ignore"]. Order matches the typed sequence.
  for (let i = 0; i < BLACKLIST_TARGETS.length; i += 1) {
    expectFollowCustomJson(broadcast.calls[i], {
      follower: FOLLOWER,
      following: followingFromOtherBlogs(BLACKLIST_TARGETS[i]),
      what: WHAT_MUTE
    });
  }

  for (const target of BLACKLIST_TARGETS) {
    await expect(userList.itemRow(target)).toBeVisible();
  }
  await expect(userList.items).toHaveCount(BLACKLIST_TARGETS.length);
});

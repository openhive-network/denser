import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { FollowedPage } from '../support/pages/followedPage';
import { TIMEOUTS } from '../support/constants';
import {
  FOLLOWER,
  FOLLOW_TARGET_USER,
  RESET_FOLLOWING_TARGET,
  TOAST_UNFOLLOWED_ALL,
  WHAT_RESET_FOLLOWING_LIST
} from '../support/followMuteContext';

/**
 * §9.1 Follow — UNF-01..04: "Unfollow all" on the owner's Followed page.
 *
 * The button opens a confirmation whose confirm stays disabled until the
 * owner types their account name; confirming broadcasts one `follow`
 * custom_json with `what: ["reset_following_list"]` (no mute reset) and
 * empties the list.
 *
 * Fixtures: `socialUnfollowAll` overlays `socialFollowOwnProfile` (the
 * seeded user follows 4 accounts) with the @hiveio followed page read.
 */

test.use({
  fixtureTestName: 'socialUnfollowAll',
  authenticatedUser: {}
});

const FOLLOWED_COUNT = 4;

async function gotoOwnFollowed(page: FollowedPage): Promise<void> {
  await page.goto(FOLLOWER);
  await expect(page.page.getByTestId('login-btn')).toBeHidden({ timeout: TIMEOUTS.HYDRATION });
  await expect(page.items).toHaveCount(FOLLOWED_COUNT);
}

test('UNF-01 — Unfollow all shows on the owner\'s Followed page only', async ({ page }) => {
  const followed = new FollowedPage(page);
  await gotoOwnFollowed(followed);
  await expect(followed.unfollowAllButton).toBeVisible();

  // @hiveio follows nobody, so its page renders without rows; the owner's button shows even then.
  await followed.goto(FOLLOW_TARGET_USER);
  await expect(followed.heading.first()).toBeVisible();
  await expect(followed.items).toHaveCount(0);
  await expect(followed.unfollowAllButton).toHaveCount(0);
});

test('UNF-02 — Confirm stays disabled until the account name is typed', async ({ page }) => {
  const followed = new FollowedPage(page);
  await gotoOwnFollowed(followed);

  await followed.unfollowAllButton.click();
  await expect(followed.dialog).toBeVisible();
  await expect(followed.dialogDescription).toContainText(`${FOLLOWED_COUNT} accounts`);
  await expect(followed.dialogConfirm).toBeDisabled();

  await followed.dialogInput.fill(FOLLOW_TARGET_USER);
  await expect(followed.dialogConfirm).toBeDisabled();

  await followed.dialogInput.fill(FOLLOWER);
  await expect(followed.dialogConfirm).toBeEnabled();
});

test('UNF-03 — Cancel broadcasts nothing', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  const followed = new FollowedPage(page);
  await gotoOwnFollowed(followed);

  await followed.unfollowAllButton.click();
  await followed.dialogInput.fill(FOLLOWER);
  await followed.dialogCancel.click();

  await expect(followed.dialog).toBeHidden();
  await expect(followed.items).toHaveCount(FOLLOWED_COUNT);
  expect(broadcast.calls).toHaveLength(0);

  // Reopening starts from an empty name again.
  await followed.unfollowAllButton.click();
  await expect(followed.dialogInput).toHaveValue('');
  await expect(followed.dialogConfirm).toBeDisabled();
});

test('UNF-04 — Confirming broadcasts one reset_following_list and empties the list', async ({
  page
}) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  const followed = new FollowedPage(page);
  await gotoOwnFollowed(followed);

  await followed.unfollowAllButton.click();
  await followed.dialogInput.fill(FOLLOWER);
  await followed.dialogConfirm.click();
  await broadcast.waitForCount(1);

  const trx = (broadcast.calls[0].params as { trx?: { operations?: unknown[] } }).trx;
  expect(trx?.operations).toHaveLength(1);
  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    following: RESET_FOLLOWING_TARGET,
    what: WHAT_RESET_FOLLOWING_LIST
  });

  await expect(page.getByText(TOAST_UNFOLLOWED_ALL, { exact: true })).toBeVisible();
  await expect(followed.items).toHaveCount(0);
  await expect(followed.unfollowAllButton).toBeDisabled();
  expect(broadcast.calls).toHaveLength(1);
});

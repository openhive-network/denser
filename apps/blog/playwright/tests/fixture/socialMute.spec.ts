import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectFollowCustomJson
} from '../support/fixture-auth/broadcast-interceptor';
import { ProfilePage } from '../support/pages/profilePage';
import {
  FOLLOWER,
  FOLLOW_TARGET_USER,
  WHAT_MUTE,
  TOAST_MUTED,
  followingFromOtherBlogs,
  gotoProfileLoggedIn
} from '../support/followMuteContext';

/**
 * §9.2 Mute — MUTE-01: mute a user from their profile.
 *
 * Base state: the seeded follower (`guest4test`) has NOT muted
 * `hiveio`, so the profile header renders the "Mute" button via
 * `features/mute-follow/buttons-container.tsx`. Clicking it goes
 * through `useMuteMutation` → `transactionService.mute(name, '', { observe: true })`
 * → wax `FollowOperation.muteBlog(signer, '', name)` → broadcast
 * `custom_json id="follow", json: ["follow", { follower, following, what: ["ignore"] }]`.
 *
 * `confirmInBlock: true` is mandatory because the mutation uses
 * `observe: true` — without it, WorkerBee never resolves and the
 * `onSuccess` toast / cache-invalidate path never fires.
 *
 * Record:  FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog exec playwright test \
 *          --config=playwright.fixture.config.ts socialMute.spec
 * Replay:  pnpm --filter @hive/blog test:fixture -- socialMute.spec
 */

test.use({
  fixtureTestName: 'socialMute',
  authenticatedUser: {}
});

test('MUTE-01 — Mute user from profile', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoProfileLoggedIn(page);
  const profile = new ProfilePage(page);
  await expect(profile.muteButton).toHaveText('Mute');

  await profile.muteButton.click();
  await broadcast.waitForCount(1);

  expectFollowCustomJson(broadcast.calls[0], {
    follower: FOLLOWER,
    // transactionService.mute(otherBlogs, '') → wax emits ["", "hiveio"].
    following: followingFromOtherBlogs(FOLLOW_TARGET_USER),
    what: WHAT_MUTE
  });

  await expect(
    page.getByText(TOAST_MUTED(FOLLOW_TARGET_USER), { exact: true })
  ).toBeVisible();
  await expect(profile.muteButton).toHaveText('Unmute');
});

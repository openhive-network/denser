import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { ProfilePage } from '../support/pages/profilePage';
import { UserListPage } from '../support/pages/userListPage';
import { TIMEOUTS } from '../support/constants';
import { FOLLOW_TARGET_USER, gotoOwnList } from '../support/followMuteContext';

/**
 * §9.3 Blacklist cross-page propagation — BL-PROP-01.
 *
 * Proves the visible UI effect that other §9 specs only assert
 * indirectly: adding `hiveio` to the seeded user's blacklist makes
 * hiveio's post cards on `/@hiveio` render the "(1)" "My blacklist"
 * marker (post-card-blacklist-mark.tsx:19-21, driven by
 * `blacklistCheck` via posts-loader.tsx:21's useFollowListQuery).
 *
 * Navigation strategy — we use `page.goto` for both pages (full
 * reload). That resets the QueryClient, so the second visit to
 * /@hiveio refires `bridge.get_follow_list(follow_type='blacklisted')`
 * and the proxy needs to serve a populated list. The fixture
 * therefore carries TWO recorded responses for that key — the first
 * (empty) one was recorded by the test itself, and the second (with
 * `hiveio` in the result) was hand-crafted; the proxy serves them in
 * filename-sorted order via its per-hash call counter
 * (fixture-proxy.ts:592 — `entries[callIndex % entries.length]`).
 * The post-blacklist-add file is named with a suffix that sorts
 * immediately after the recorded one. See `_index.json` for the
 * specific pairing.
 *
 * Why not click the row's BasePathLink to navigate client-side: the
 * mutation's `_temporary: true` flag (use-blacklist-mutations.ts:21)
 * never clears in fixture mode because the broadcast is mocked and
 * the chain never confirms the row's presence on real refetch. The
 * row therefore renders as a plain `<span>` (list-item.tsx:84) and
 * isn't clickable for navigation.
 *
 * `span[title="My blacklist"]` is the precise locator for the
 * client-side blacklistCheck branch — distinct from `post.blacklists`
 * (which would render with the blacklist reason as the title).
 */

test.use({
  fixtureTestName: 'socialBlacklistPropagation',
  authenticatedUser: {}
});

test('BL-PROP-01 — Blacklist add propagates "(1)" mark to author post cards', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page, undefined, {
    confirmInBlock: true
  });
  await gotoOwnList(page, 'blacklisted');
  const userList = new UserListPage(page);
  // Baseline: the seeded user's blacklist is empty.
  await expect(userList.emptyState).toBeVisible();

  await userList.addAccount(FOLLOW_TARGET_USER);
  await broadcast.waitForCount(1);
  await expect(userList.itemRow(FOLLOW_TARGET_USER)).toBeVisible();

  // Full reload — the proxy serves the second-recorded
  // bridge.get_follow_list(blacklisted) response (populated with
  // hiveio) on this call, simulating the post-broadcast chain state.
  await page.goto(`/@${FOLLOW_TARGET_USER}`);
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });

  const profile = new ProfilePage(page);
  await expect(profile.profileBlogPostsList).toBeVisible();

  const firstPost = page.getByTestId('post-list-item').first();
  await expect(firstPost.getByTestId('post-author')).toHaveText(FOLLOW_TARGET_USER);
  // The marker — proves the client-side blacklistCheck path renders
  // the "(1)" badge once the viewer's blacklist contains the post author.
  const blacklistMark = firstPost.locator('span[title="My blacklist"]');
  await expect(blacklistMark).toBeVisible();
  await expect(blacklistMark).toHaveText('(1)');
});

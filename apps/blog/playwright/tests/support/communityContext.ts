import { expect, type Page } from '@playwright/test';
import { TIMEOUTS } from './constants';

/**
 * §10 Communities — shared constants and helpers.
 *
 * All community mutations (subscribe / unsubscribe / setRole / setUserTitle /
 * pin / unpin / flag / mutePost / unmutePost / updateProps) broadcast as a
 * single `custom_json_operation` whose `id` is `"community"` and whose
 * `json` parses to `[action, payload]` — where `action` is the verb
 * (`"subscribe"`, `"setRole"`, …) and `payload` is the operation-specific
 * object that wax `CommunityOperation.<verb>(…)` serialises.
 *
 * Pin the action verbs here so specs reference symbols, not magic strings,
 * and so a wax-side rename (e.g. `pinPost` → `pin_post`) fails in one place
 * instead of N specs.
 *
 * The mutation hooks (`features/community-profile/subscribe-community.tsx`,
 * `features/community-profile/edit-dialog-content.tsx`, `add-role.tsx`,
 * `change-title-dialog.tsx`, `components/hooks/use-pin-mutations.ts`,
 * `use-flag-mutation.ts`, `use-mute-post-mutations.ts`) all run
 * `transactionService.X({ observe: true })` — so specs MUST install the
 * broadcast interceptor with `confirmInBlock: true` or the toast and
 * cache-invalidation never fire.
 */

/** Seeded logged-in user. Same env contract as VOTER / FOLLOWER. */
export const SUBSCRIBER = process.env.CI_TEST_USER || 'guest4test';

/**
 * Target community for the "subscribe" specs (COM-02, COM-04, COM-13).
 * `hive-194913` is "Photography Lovers" — large stable community on
 * mainnet that the seeded user (`guest4test`) is NOT subscribed to.
 * Pick verified against `bridge.list_all_subscriptions` for guest4test
 * (Worldmappin / LeoFinance / Testing Zone are the existing 3 subs;
 * Photography Lovers isn't in that set).
 */
export const COMMUNITY_TAG = 'hive-194913';
export const COMMUNITY_NAME = 'Photography Lovers';

/**
 * Target community for the "unsubscribe" specs (COM-03, COM-05).
 * `hive-167922` is "LeoFinance" — guest4test IS subscribed to it on
 * mainnet, so the leave path renders without needing an overlay.
 */
export const COMMUNITY_TAG_SUBSCRIBED = 'hive-167922';
export const COMMUNITY_NAME_SUBSCRIBED = 'LeoFinance';

/**
 * Community used by the moderation specs (COM-08..13).
 * `hive-160391` is "Blockchain Wizardry" — a community with a rich, stable
 * role list on mainnet (owner / admin=gandalf / mod=gtg "Wizard" / members
 * / muted). The seeded user (SUBSCRIBER) is NOT in that list, so:
 *   - COM-13 (view roles) reads the list as-is (no overlay needed).
 *   - COM-09 (set role) overlays `bridge.list_community_roles` via
 *     `generate-community-variants.mjs` to inject SUBSCRIBER as admin so the
 *     AddRole surface renders.
 * It's also the community of the `loggedInPostDetail` base (a depth-0 post
 * by gtg), which the post-page moderation specs (COM-10/11/12) overlay.
 */
export const MOD_COMMUNITY_TAG = 'hive-160391';
export const MOD_COMMUNITY_NAME = 'Blockchain Wizardry';

/**
 * Post used by COM-11 / COM-12 (pin / unpin). `gtg/hive-hardfork-28-...` is a
 * depth-0 post in hive-160391 that is pinned in the recorded community feed —
 * so the detail post (where pin/unpin acts) and the feed post (where the
 * pinned tag renders) are the same, enabling the round-trip assertion. COM-11
 * asserts the feed shows it pinned (base state); COM-12's overlay un-pins it
 * in get_ranked_posts and asserts the tag is gone.
 */
export const PIN_POST_AUTHOR = 'gtg';
export const PIN_POST_PERMLINK = 'hive-hardfork-28-jump-starter-kit';

/**
 * Community for COM-08 (edit properties). `hive-139531` is "HiveDevs" — the
 * community of the `loggedInTagCommunityFeeds` base, which COM-08 overlays
 * (`communityEditProps`) by injecting SUBSCRIBER as admin into
 * `get_community.team` so the EditCommunityDialog renders in the sidebar.
 */
export const EDIT_COMMUNITY_TAG = 'hive-139531';
export const EDIT_COMMUNITY_NAME = 'HiveDevs';

/**
 * Wire-form `action` strings — the first element of the
 * `["action", payload]` tuple inside `custom_json.json`. Pinned against
 * `CommunityOperation` in `@hiveio/wax`. The community-op spec (HIP-0)
 * sends camelCase verbs, NOT snake_case — verify against wax during
 * recording and update here if a verb is spelled differently in the wire
 * form than the wrapper name.
 */
export const ACTION_SUBSCRIBE = 'subscribe';
export const ACTION_UNSUBSCRIBE = 'unsubscribe';
export const ACTION_SET_ROLE = 'setRole';
export const ACTION_SET_USER_TITLE = 'setUserTitle';
export const ACTION_PIN_POST = 'pinPost';
export const ACTION_UNPIN_POST = 'unpinPost';
export const ACTION_FLAG_POST = 'flagPost';
export const ACTION_MUTE_POST = 'mutePost';
export const ACTION_UNMUTE_POST = 'unmutePost';
export const ACTION_UPDATE_PROPS = 'updateProps';

/** Hive community roles as accepted by `setRole`. Pinned against wax `EAvailableCommunityRoles`. */
export const ROLE_OWNER = 'owner';
export const ROLE_MEMBER = 'member';
export const ROLE_MOD = 'mod';
export const ROLE_ADMIN = 'admin';
export const ROLE_GUEST = 'guest';
export const ROLE_MUTED = 'muted';

/**
 * Stable leadership rows in `hive-160391`'s role list, asserted by COM-13.
 * The roles table renders the RAW role string (not the translated label) —
 * see `table-item.tsx` (`{item.role}`). `title` is the per-user community
 * title column. Pinned here so a re-record that changes leadership fails in
 * one place instead of inside the spec.
 */
export const ROLE_ROW_ADMIN = { account: 'gandalf', role: ROLE_ADMIN, title: '' };
export const ROLE_ROW_MOD = { account: 'gtg', role: ROLE_MOD, title: 'Wizard' };

/**
 * Success-toast literals fired by the community mutation hooks. Pinned
 * against `features/community-profile/hooks/use-subscribe-mutations.ts`
 * — keep aligned when those hooks change. Note the asymmetry: subscribe
 * uses the community *title* in the toast, unsubscribe uses the raw
 * community *tag* (hive-XXXXXX). That's the hook as written; not our
 * choice. Use the `_TITLE` arg for subscribe, the `_TAG` arg for unsubscribe.
 */
export const TOAST_SUBSCRIBED = (communityTitle: string): string =>
  `You have successfully subscribed to ${communityTitle}.`;
export const TOAST_UNSUBSCRIBED = (communityTag: string): string =>
  `You have successfully unsubscribed from ${communityTag}.`;

/**
 * Success toast fired by `useSetRoleMutation` (COM-09). Pinned against
 * `hooks/use-set-role-mutations.ts:68`. Note: `useUserTitleMutation`
 * (COM-10) fires NO toast — assert on the broadcast + dialog close instead.
 */
export const TOAST_ROLE_UPDATED = (username: string, community: string): string =>
  `Role updated successfully for ${username} in community ${community}.`;

/**
 * Success toast fired by `useUpdateCommunityMutation` (COM-08). Pinned
 * against `hooks/use-update-community-mutation.ts:61`. The interpolated value
 * is the community *tag* (`data.name`), not the title.
 */
export const TOAST_COMMUNITY_UPDATED = (communityTag: string): string =>
  `You have successfully updated the community ${communityTag}.`;

/**
 * Pin/unpin success toasts (COM-11 / COM-12). Pinned against
 * `components/hooks/use-pin-mutations.ts:49,101` — fixed strings, no
 * interpolation.
 */
export const TOAST_PINNED = 'Post has been pinned successfully.';
export const TOAST_UNPINNED = 'Post has been unpinned successfully.';

/**
 * Navigate to a community page and wait for App Router hydration to settle
 * on the logged-in branch. Without this, `useUserCore`'s `isMounted` guard
 * briefly renders post cards in their anonymous (DialogLogin-wrapped)
 * branch — clicking lands on the login dialog instead of the real handler.
 *
 * Mirrors `gotoProfileLoggedIn` from `followMuteContext.ts`.
 */
export async function gotoCommunityLoggedIn(
  page: Page,
  community: string = COMMUNITY_TAG
): Promise<void> {
  await page.goto(`/trending/${community}`);
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Navigate to the communities explorer (`/communities`) and wait for
 * hydration on the logged-in branch. The explorer card's subscribe button
 * (`community-subscribe-button` inside `community-list-item`) only fires
 * the real handler once the user state has settled.
 */
export async function gotoCommunitiesExplorerLoggedIn(
  page: Page
): Promise<void> {
  await page.goto('/communities');
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Navigate to a community's roles page (`/roles/<tag>`) and wait for
 * hydration on the logged-in branch. The roles table and the AddRole
 * surface (COM-09) only render the real moderator UI once user state has
 * settled — the AddRole panel is gated on the seeded user's role level,
 * which is read from the (overlaid) `bridge.list_community_roles`.
 */
export async function gotoRolesPageLoggedIn(
  page: Page,
  community: string = MOD_COMMUNITY_TAG
): Promise<void> {
  await page.goto(`/roles/${community}`);
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
}

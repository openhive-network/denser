import { expect, type Page } from '@playwright/test';
import { TIMEOUTS } from './constants';

/**
 * §9 Follow / Mute / Blacklist — shared constants and helpers.
 *
 * All social-graph operations broadcast as `custom_json_operation`
 * (id="follow") whose JSON parses to
 * `["follow", { follower, following, what }]`. The `what` array names
 * the variant; pin the literal values here so specs reference symbols
 * not magic strings (and so re-records that flip a wire-form spelling
 * fail in one place).
 *
 * Toast literals come from the React Query mutation hooks
 * (`features/mute-follow/hooks/use-{follow,mute}-mutations.ts` and
 * `components/hooks/use-{blacklist,follow-blacklist,follow-muted-list,reset}-mutation*.ts`),
 * not from translation keys. Keep them aligned when those hooks change.
 */

/** Seeded logged-in user. Same env contract as VOTER / SETTINGS_USER. */
export const FOLLOWER = process.env.CI_TEST_USER || 'guest4test';

/** Stable target account used as the follow / mute / blacklist subject. */
export const FOLLOW_TARGET_USER = 'hiveio';

/**
 * Targets used by the "add multiple from page" cases (MUTE-04, BL-03,
 * FBL-03, FML-03). Picked to be well-known stable accounts that the
 * fixture proxy can resolve in record mode.
 */
export const BLACKLIST_TARGETS: string[] = ['hiveio', 'ned', 'dan'];

/**
 * Wire-form `what` arrays — one symbol per operation variant. Values
 * are pinned against `EFollowActions` in `@hiveio/wax` so the helper
 * (`expectFollowCustomJson`) can validate the broadcast verbatim.
 * Wax always wraps the action in a 1-element array.
 */
export const WHAT_FOLLOW: string[] = ['blog'];
export const WHAT_UNFOLLOW: string[] = ['']; // EFollowActions.UNFOLLOW = ""
export const WHAT_MUTE: string[] = ['ignore'];
export const WHAT_UNMUTE: string[] = ['']; // unmuteBlog → unfollowBlog in wax
export const WHAT_BLACKLIST: string[] = ['blacklist'];
export const WHAT_UNBLACKLIST: string[] = ['unblacklist'];
export const WHAT_FOLLOW_BLACKLIST: string[] = ['follow_blacklist'];
export const WHAT_UNFOLLOW_BLACKLIST: string[] = ['unfollow_blacklist'];
export const WHAT_FOLLOW_MUTED: string[] = ['follow_muted'];
export const WHAT_UNFOLLOW_MUTED: string[] = ['unfollow_muted'];
// `resetBlogList()` in transactionService maps to RESET_MUTED_LIST via
// EFollowBlogAction.MUTE_BLOG (transaction/index.ts:444). Not a "reset
// blog list" misnomer despite the wrapper name.
export const WHAT_RESET_MUTED_LIST: string[] = ['reset_muted_list'];
export const WHAT_RESET_BLACKLIST: string[] = ['reset_blacklist'];
export const WHAT_RESET_FOLLOW_BLACKLIST: string[] = ['reset_follow_blacklist'];
export const WHAT_RESET_FOLLOW_MUTED: string[] = ['reset_follow_muted_list'];

/**
 * Wax's `transactionService.X(otherBlogs, blog?)` wrappers
 * (mute / blacklistBlog / followBlacklistBlog / followMutedBlog) pass
 * `blog=''` plus `...otherBlogs.split(', ')` to wax, which then emits
 * `following: [blog, ...otherBlogs]` — a 2-element array for a single
 * target add: `["", "<target>"]`.
 */
export const followingFromOtherBlogs = (target: string): string[] => ['', target];

/**
 * Reset wrappers (resetBlogList / resetBlacklistBlog /
 * resetFollowBlacklistBlog / resetFollowMutedBlog in transactionService)
 * pass `blog='all'` and no rest args, so wax emits `following: 'all'`
 * (single string, not an array).
 */
export const RESET_FOLLOWING_TARGET = 'all';

/** Success-toast literals fired by the mutation hooks. */
export const TOAST_FOLLOWED = (target: string): string =>
  `You are now following ${target}.`;
export const TOAST_UNFOLLOWED = (target: string): string =>
  `You have unfollowed ${target}.`;
export const TOAST_MUTED = (target: string): string =>
  `You have muted ${target}.`;
export const TOAST_UNMUTED = (target: string): string =>
  `You have unmuted ${target}.`;
export const TOAST_RESET_BLOG_LIST = 'Your blog list has been reset.';

/** Owner-only list-page slugs under `/@{owner}/lists/{slug}`. */
export type OwnerListSlug =
  | 'muted'
  | 'blacklisted'
  | 'followed_blacklists'
  | 'followed_muted_lists';

/**
 * Navigate to a user profile and wait for App Router hydration to settle
 * on the logged-in branch. Without this, `useUserCore`'s `isMounted`
 * guard briefly renders the profile header in its anonymous variant and
 * clicks on `profile-follow-button` land on the DialogLogin wrapper
 * (see `features/mute-follow/buttons-container.tsx:121-131`).
 */
export async function gotoProfileLoggedIn(
  page: Page,
  target: string = FOLLOW_TARGET_USER
): Promise<void> {
  await page.goto(`/@${target}`);
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Navigate to the seeded user's own list-management page (where the
 * "Add account to list" + "Reset" controls render — they only show when
 * `user.username === username && user.isLoggedIn`, see
 * `features/account-lists/list-area.tsx:170,227`).
 */
export async function gotoOwnList(
  page: Page,
  list: OwnerListSlug
): Promise<void> {
  await page.goto(`/@${FOLLOWER}/lists/${list}`);
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
  await expect(page.getByTestId('user-list-area')).toBeVisible();
}

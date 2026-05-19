import { expect, type Page } from '@playwright/test';
import { TIMEOUTS } from './constants';

/**
 * §4 Post Display & Views — shared identifiers and navigation helpers.
 *
 * The §4 specs are render-only: no broadcast interceptor, no chain
 * mutations. Each spec navigates as a logged-in observer and asserts
 * the feed/post-detail/profile UI hydrates with the expected shape.
 *
 * Identifiers are pinned to match existing recorded fixtures so a single
 * underlying mainnet snapshot can be re-used across §1 (anonymous,
 * already implemented) and §4 (logged-in observer). If you re-record a
 * base fixture and the picked post/community no longer ranks where it
 * used to, update both this file and the consuming spec in the same
 * commit.
 */

/** Seeded logged-in observer — same env contract as VOTER/OWN_POST_AUTHOR. */
export const OBSERVER = process.env.CI_TEST_USER || 'guest4test';

/**
 * Other-user profile used by VIEW-09..12 (third-party profile rendering).
 * `hiveio` has a stable cover image, reputation, posts/comments/replies
 * tabs that all return non-empty lists, and is already the subject of the
 * anonymous `userProfileTabs/` fixture — so the observer overlay can be
 * a thin variant on the same recording.
 */
export const OTHER_USER = 'hiveio';

/**
 * Post-detail identifiers used by VIEW-08. Match the seeds in
 * `tests/fixture/postDetail.spec.ts` so the §4 spec can be backed by an
 * overlay over the existing `postDetail/` fixture if record-time RPCs
 * for the logged-in observer turn out to be a strict superset of the
 * anonymous set. If they diverge (e.g. observer-specific
 * `database_api.list_votes` rows), record a fresh `loggedInPostDetail/`
 * dir instead.
 */
export const POST_DETAIL_AUTHOR = 'gtg';
export const POST_DETAIL_PERMLINK = 'hive-hardfork-25-jump-starter-kit';
export const POST_DETAIL_COMMUNITY = 'hive-160391';

/**
 * Community tag used by VIEW-07 (tag-filtered feed) and VIEW-14
 * (community page). Matches `tests/fixture/tagCommunityFeeds.spec.ts`
 * so the observer overlay can re-use the recorded ranked-posts call.
 */
export const SAMPLE_COMMUNITY_TAG = 'hive-139531';

/**
 * Main feed routes — VIEW-01..05.
 */
export const FEED_ROUTES = {
  trending: '/trending',
  hot: '/hot',
  created: '/created',
  payout: '/payout',
  muted: '/muted'
} as const;

/**
 * Personalised "My" feed routes — VIEW-06. Each is a logged-in-only
 * surface that filters the corresponding main feed to posts from
 * communities the observer is subscribed to.
 */
export const MY_FEED_ROUTES = {
  trending: '/trending/my',
  hot: '/hot/my',
  created: '/created/my',
  payout: '/payout/my',
  muted: '/muted/my'
} as const;

/**
 * "My friends" feed — posts from accounts the observer follows. The
 * link in `CommunitiesMyBar` points at `/@{observer}/feed`; the bare
 * `/feed` route renders the same view via the layout's `tag === 'feed'`
 * branch (features/layouts/main-page-layout.tsx:49).
 */
export function myFriendsUrl(): string {
  return `/@${OBSERVER}/feed`;
}

/**
 * Expected text in `data-testid="posts-filter"` for each feed URL.
 * The filter dropdown is hidden on `/feed` (My friends) — only the
 * `community-name` heading reads "My friends" there.
 */
export const FILTER_LABEL: Record<string, string> = {
  '/trending': 'Trending',
  '/hot': 'Hot',
  '/created': 'New',
  '/payout': 'Payouts',
  '/muted': 'Muted'
};

/**
 * Navigate to a URL and wait for App Router hydration to settle into the
 * logged-in state. Mirrors `gotoTrendingLoggedIn` from
 * `postVotingContext.ts` but URL-agnostic so the same preamble works for
 * the seven feed variants (/trending, /hot, ..., /trending/my, ...),
 * post-detail pages, and profile pages.
 *
 * Without this, `useUserCore`'s `isMounted` guard re-renders interactive
 * elements through their anonymous (DialogLogin-wrapped) branch for a
 * frame, and any subsequent click lands on the login dialog instead of
 * the real handler. For §4's render-only assertions the guard is less
 * dangerous but still produces flaky text matches when the layout
 * briefly switches between observer / anonymous variants.
 */
export async function gotoLoggedIn(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
}

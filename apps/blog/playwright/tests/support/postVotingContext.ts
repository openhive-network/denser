import { expect, type Page } from '@playwright/test';
import { TIMEOUTS } from './constants';

/**
 * Shared context for §6.1 Post Voting fixture specs. Keeps seeded-user
 * details, first-post locators, weight magic-numbers, and the hydration
 * preamble in one place so individual specs stay focused on the flow
 * they exercise.
 */

/** Seeded username — sourced from CI env with a sensible default. */
export const VOTER = process.env.CI_TEST_USER || 'guest4test';

/**
 * Author/permlink of the first post on /trending in the committed
 * fixture dirs. Update these together when re-recording the base
 * fixture (and any pre-voted variants it seeds).
 */
export const FIRST_POST_AUTHOR = 'angelica7';
export const FIRST_POST_PERMLINK = 'mis-8-anos-en-hive';

/**
 * Weights in Hive's basis-points convention: 10000 = 100% upvote,
 * -10000 = 100% downvote, 0 = remove existing vote.
 */
export const FULL_UPVOTE = 10000;
export const FULL_DOWNVOTE = -10000;
export const REMOVE_VOTE = 0;

/**
 * Slider helpers: the slider shows 1-100%, the broadcast uses basis
 * points, so weight = displayedPercent * BASIS_POINTS_PER_PERCENT.
 */
export const SLIDER_MIN = 1;
export const SLIDER_MAX = 100;
export const BASIS_POINTS_PER_PERCENT = 100;
/** Default slider drag target for tests that need a non-100% value. */
export const SLIDER_TARGET_PERCENT = 73;
/** Mouse drag can snap ±1-2 around target; allow a couple steps. */
export const SLIDER_DRAG_TOLERANCE = 3;

/**
 * Navigate to /trending and wait for App Router hydration to settle
 * into the logged-in state. Without this, `useUserCore`'s `isMounted`
 * guard briefly re-renders post cards into their anonymous branch and
 * clicks land on the DialogLogin wrapper instead of the vote handler.
 */
export async function gotoTrendingLoggedIn(page: Page): Promise<void> {
  await page.goto('/trending');
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Wait until the first post's upvote icon shows the "already upvoted"
 * visual state (the `bg-destructive-icon` class is applied when
 * `userVote.vote_percent > 0`). Until this class lands, the component
 * is still in its pre-fetch branch and clicks would submit a new vote
 * instead of opening the VoteRemovalDialog — a subtle race because
 * `login-btn` hides as soon as `user.isLoggedIn` is true, which doesn't
 * wait for `list_votes` to resolve.
 */
export async function expectFirstPostUpvotedState(page: Page): Promise<void> {
  await expect(
    page.getByTestId('upvote-button').first().locator('svg')
  ).toHaveClass(/bg-destructive-icon/);
}

/**
 * Downvote analog — filled downvote icon gets the `bg-gray-600` class
 * when `userVote.vote_percent < 0`.
 */
export async function expectFirstPostDownvotedState(
  page: Page
): Promise<void> {
  await expect(
    page.getByTestId('downvote-button').first().locator('svg')
  ).toHaveClass(/bg-gray-600/);
}

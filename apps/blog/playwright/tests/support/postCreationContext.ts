import { expect, type Page } from '@playwright/test';
import { TIMEOUTS } from './constants';

/**
 * Shared context for §2.1 Basic Post Creation fixture specs. Mirrors the
 * structure of commentingContext.ts / postVotingContext.ts — a single
 * source of truth for the seeded user, target routes, and editor-typing
 * helpers used by every POST-NN spec.
 *
 * Why a separate context (rather than reusing commentingContext): post
 * creation starts from /submit.html (or a community trending page),
 * never from a post-detail page, and produces a top-level
 * comment_operation (parent_author=''), so the constants don't overlap.
 */

export const POST_AUTHOR = process.env.CI_TEST_USER || 'guest4test';

/** Top-level submit form — POST-01, POST-02, POST-06. */
export const SUBMIT_PATH = '/submit.html';

/**
 * Community used by POST-03. Same id as the one already pinned by §5/§6.2
 * fixtures so we don't grow the fixture footprint with a new community
 * registration. The trending feed is the entry point a user clicks
 * "New Post" from.
 */
export const POST_COMMUNITY = 'hive-160391';
export const COMMUNITY_TRENDING_PATH = `/trending/${POST_COMMUNITY}`;

/**
 * Default tag for non-community posts. `parent_permlink` in the produced
 * comment_operation is the FIRST tag (or `category` from the URL when
 * posting in a community), so this string ends up asserted in TX-01.
 * Keep it short and lowercase to satisfy the editor's tag validator.
 */
export const DEFAULT_TAG = 'test';

/**
 * Navigate to /submit.html as the seeded user. Mirrors
 * gotoPostLoggedIn from commentingContext.ts: waits for hydration via
 * the login-btn-hidden signal so subsequent interactions don't race
 * the initial render.
 */
export async function gotoSubmitLoggedIn(page: Page): Promise<void> {
  await page.goto(SUBMIT_PATH, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Navigate to the community trending feed and click "New Post". Used
 * by POST-03. The button (community-new-post-button) is a `<Link>` to
 * `/submit.html?category=<community>`, so after the click the page
 * lands on the editor with the community pre-selected via URL param —
 * which is what we want to validate in the resulting broadcast
 * (parent_permlink === community id).
 */
export async function gotoCommunityNewPostLoggedIn(page: Page): Promise<void> {
  await page.goto(COMMUNITY_TRENDING_PATH, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
  // Sidebar variant on desktop, simple-description on mobile/narrow — the
  // existing communitiesPage POM scopes by parent testid; the link itself
  // is the same testid in either layout, so a direct .first() click
  // suffices for the desktop viewport the fixture worker runs in.
  await page.getByTestId('community-new-post-button').first().click();
  await expect(page.getByTestId('post-title-input')).toBeVisible({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Type into the post body's CodeMirror surface. CM6 is a contenteditable
 * div, not a textarea — `.fill()` doesn't apply. Same dance as
 * typeIntoReplyEditor in commentingContext.ts, but scoped to the single
 * editor on /submit.html (no nested reply-editor instances to disambiguate).
 *
 * `force: true` skips the actionability re-check; toolbar tooltips can
 * briefly overlay .cm-content during hover and stall an unforced click
 * (see CMT-06 flake history).
 */
export async function fillPostBody(page: Page, body: string): Promise<void> {
  const cm = page.locator('div.cm-editor').locator('.cm-content').first();
  await cm.waitFor({ state: 'visible', timeout: 30_000 });
  await cm.click({ force: true });
  await page.keyboard.type(body);
}

/** Click the editor's submit button. */
export async function submitPost(page: Page): Promise<void> {
  await page.locator('[data-testid="submit-post-button"]').click();
}

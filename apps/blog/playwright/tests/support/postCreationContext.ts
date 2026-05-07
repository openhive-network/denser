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
 * registration.
 */
export const POST_COMMUNITY = 'hive-160391';

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
 * Land on the post editor pre-targeted to the community used by POST-03.
 * Reproduces the end-state of clicking "New Post" on the community page,
 * which does two things in `new-post-button.tsx`:
 *   1. onClick stores `postData-new-<user>` in localStorage with
 *      `category: <community>` (TTL-wrapped via setStorageItem)
 *   2. <Link> navigates to `/submit.html?category=<community>`
 *
 * We seed (1) directly via page.evaluate and then goto (2). A live
 * click-through is layout-fragile: the button is rendered both in
 * `community-info-sidebar` (xl+) and `community-simple-description-sidebar`
 * (md..lg) and the visible instance depends on viewport AND
 * `useUserClient` hydration timing — neither is worth defending in a
 * fixture that exists to validate the broadcast, not the navigation.
 *
 * URL alone doesn't reach the form's category field reliably:
 * `useSearchParams()` initial value can be undefined during the first
 * render that `usePostFormState` memoises, so the form picks up
 * `storedPost.category` (defaulting to 'blog') before
 * `categoryParam='hive-160391'` arrives. Seeding storedPost first wins
 * regardless of the timing.
 */
export async function gotoCommunityNewPostLoggedIn(page: Page): Promise<void> {
  // Land on the origin once so localStorage exists for the seeded user.
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.evaluate(
    ([user, community, ttlMs]) => {
      const key = `postData-new-${user}`;
      const now = Date.now();
      const draft = {
        title: '',
        postArea: '',
        postSummary: '',
        tags: '',
        author: '',
        category: community,
        beneficiaries: [],
        maxAcceptedPayout: 1000000,
        payoutType: '50%'
      };
      // Mirror @ui/lib/storage-with-ttl setStorageItem layout: a wrapper
      // with `value`, `expiresAt` (now + ttl) and `createdAt`.
      window.localStorage.setItem(
        key,
        JSON.stringify({
          value: draft,
          expiresAt: now + ttlMs,
          createdAt: now
        })
      );
    },
    [POST_AUTHOR, POST_COMMUNITY, 30 * 24 * 60 * 60 * 1000]
  );

  await page.goto(`${SUBMIT_PATH}?category=${POST_COMMUNITY}`, {
    waitUntil: 'domcontentloaded'
  });
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
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

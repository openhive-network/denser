import { expect, type Page } from '@playwright/test';
import { TIMEOUTS } from './constants';

/**
 * §3 Post Editing — shared constants and navigation helpers.
 *
 * Edit and delete are inline flows on the post-detail page; they reuse the
 * seeded user (CI_TEST_USER, default `guest4test`) and a real on-chain post
 * by that user as the fixture base. The base fixture set (`postEditOwn`) is
 * a neutralised recording of the post: `payout_at` bumped to 2030,
 * `max_accepted_payout` reset to no-limit (1_000_000 HBD), `net_rshares` 0,
 * `percent_hbd` 10000, and a non-empty `tags` array (so EDIT-02 has
 * something to mutate). See `support/fixture-auth/generate-edit-variants.mjs`
 * for the overlays that flip these fields for §3 EDIT-03b/c and EDIT-04.
 */

export const OWN_POST_AUTHOR = process.env.CI_TEST_USER || 'guest4test';

/**
 * Permlink of the real on-chain post used as the fixture base. Any post
 * by OWN_POST_AUTHOR works; we pin to `test-post-1772011775775` because
 * its body is short (~46 chars) and category/tags are trivially patchable
 * during fixture neutralisation.
 */
export const OWN_POST_PERMLINK = 'test-post-1772011775775';

/**
 * URL category slug. Cosmetic — `bridge.get_post` is keyed by
 * (author, permlink), so the slug in `/{category}/@{author}/{permlink}`
 * doesn't influence the SSR fetch. Matches the real-on-chain category
 * to keep record/replay parity, but the JSON `category` field can be
 * patched freely in overlays without changing this URL constant.
 */
export const OWN_POST_URL_SLUG = 'spam';

/**
 * Original post body — patched into the neutralised base fixture so EDIT
 * specs have a known starting point against which to assert mutations.
 */
export const OWN_POST_ORIGINAL_TITLE = 'Test Post';
export const OWN_POST_ORIGINAL_BODY =
  'This is a test post created using the Wax SDK.';

/**
 * Seeded tag list on the base fixture (patched in after record). EDIT-02
 * deletes `bar` and adds `baz`, so the expected post-edit `json_metadata.tags`
 * is `['test', 'foo', 'baz']`. The first tag doubles as `parent_permlink`
 * for top-level posts not in a community (BlogPostOperation, see
 * packages/transaction/index.ts:650).
 */
export const OWN_POST_ORIGINAL_TAGS = ['test', 'foo', 'bar'];

/**
 * Edited values used by EDIT-01.
 */
export const EDIT_NEW_TITLE = 'Test Post (edited)';
export const EDIT_NEW_BODY = 'Edited body via E2E §3 EDIT-01.';

/**
 * Community used by the `postEditOwn_community` overlay (EDIT-04). The
 * overlay generator stamps the same value into `community`, `category`,
 * and `community_title`. Picked to match a real community that the
 * fixture proxy can resolve via `bridge.get_community` if we ever need
 * to fetch it live.
 */
export const OWN_POST_COMMUNITY = 'hive-137823';
export const OWN_POST_COMMUNITY_TITLE = 'Test Hive 137823';

/**
 * Build the post-detail URL the spec navigates to. Always uses
 * OWN_POST_URL_SLUG regardless of overlay — see the slug-vs-category
 * note above.
 */
export function ownPostUrl(): string {
  return `/${OWN_POST_URL_SLUG}/@${OWN_POST_AUTHOR}/${OWN_POST_PERMLINK}`;
}

/**
 * Navigate to the seeded user's own post-detail page and wait for hydration
 * to settle. Mirrors `gotoTrendingLoggedIn` from postVotingContext.ts: the
 * `login-btn` test-id is the cheapest hydration signal because it hides as
 * soon as `useUserCore.isLoggedIn` flips true on the client.
 *
 * The post-detail page is SSR-rendered, so `page.route` cannot intercept
 * `bridge.get_post` / `bridge.get_discussion` — those flow through the
 * fixture proxy and serve from disk. The post must already exist in the
 * fixture dir set via `test.use({ fixtureTestName })`.
 */
export async function gotoOwnPostLoggedIn(page: Page): Promise<void> {
  await page.goto(ownPostUrl(), { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('login-btn')).toBeHidden({
    timeout: TIMEOUTS.HYDRATION
  });
  // Wait for the post-detail footer to mount — it carries the `post-edit`
  // and `comment-card-footer-delete` triggers we click below.
  await expect(page.getByTestId('author-data-post-footer')).toBeVisible({
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Click the "Edit" trigger on the post footer and wait for the inline
 * PostForm to mount. The post-detail page does NOT navigate — `setEdit(true)`
 * swaps PostBodySection out for `<PostForm editMode={true} post_s={postData} />`
 * (content.tsx:580-591), so the next interaction surface is the post
 * editor's form, identified by `submit-post-button` being visible.
 *
 * The Edit button is also disabled (rendered without the toggle) while
 * `edit === true`, so re-entering edit-mode in the same spec requires
 * cancelling first via the form's Cancel/Clean button.
 */
export async function enterEditMode(page: Page): Promise<void> {
  await page.getByTestId('post-edit').click();
  await expect(page.getByTestId('submit-post-button')).toBeVisible({
    timeout: TIMEOUTS.HYDRATION
  });
  // The inline PostForm reads its initial values from `post_s` (the
  // current postData snapshot). Wait for the title input to be populated
  // before the spec mutates fields — otherwise a `fill()` can race the
  // `usePostFormState` defaults-into-form hydration and end up overwritten.
  await expect(page.getByTestId('post-title-input')).not.toHaveValue('', {
    timeout: TIMEOUTS.HYDRATION
  });
}

/**
 * Open PostDeleteDialog from the post-detail footer and click "OK" to
 * confirm. The button only appears when:
 *   - the post has no children (`postData.children === 0`)
 *   - the seeded user is the author
 *   - the payout window is still open (`new Date() < new Date(payout_at)`)
 *
 * The base fixture is patched to satisfy all three (`payout_at = 2030`,
 * `children = 0`, `author = OWN_POST_AUTHOR`). The shared `flag-dialog-*`
 * test-ids are the same ones the comment flag flow uses — see
 * `apps/blog/features/post-rendering/post-delete-dialog.tsx`.
 */
export async function confirmDelete(page: Page): Promise<void> {
  await page.getByTestId('comment-card-footer-delete').click();
  await expect(page.getByTestId('flag-dialog-header')).toBeVisible({
    timeout: TIMEOUTS.HYDRATION
  });
  await page.getByTestId('flag-dialog-ok').click();
}

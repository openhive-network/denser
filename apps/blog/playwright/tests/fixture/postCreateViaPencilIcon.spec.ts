import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { PostPage } from '../support/pages/postPage';
import {
  POST_AUTHOR,
  DEFAULT_TAG,
  fillPostBody,
  submitPost
} from '../support/postCreationContext';
import { TIMEOUTS } from '../support/constants';

/**
 * Post creation via the global pencil-icon flow (§2.1 POST-04).
 *
 * Wiki POST-04 reads "Create post by clicking pencil icon and selecting
 * community". The pencil icon (`data-testid="nav-pencil"` in
 * features/layouts/site-header/main-bar.tsx) is a plain
 * `<Link href="/submit.html">` — clicking it lands on the editor with
 * NO community pre-selected. The community choice happens inside the
 * editor via the `posting-to-list-trigger` Radix Select. So this spec
 * exercises:
 *
 *   1) goto / → hydrate
 *   2) click `nav-pencil` → router pushes to /submit.html
 *   3) pick a community via the editor's "Posting to" dropdown
 *   4) type title/body/tag
 *   5) submit
 *
 * Distinct from POST-03 (which uses ?category=<id> URL param + the
 * community sidebar's "New Post" button) — POST-04 enters the editor
 * with category='blog' (the default) and switches it via dropdown,
 * which exercises a different code path in usePostFormState (the
 * dropdown writes via form.setValue to react-hook-form, not via the
 * categoryParam route).
 *
 * Target community: hive-167922 (LeoFinance) — it's already in
 * guest4test's recorded subscription list, so the dropdown shows it.
 *
 * Record:  FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- postCreateViaPencilIcon.spec
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateViaPencilIcon.spec
 */

test.use({
  fixtureTestName: 'postCreatePencilIcon',
  authenticatedUser: {}
});

const TARGET_COMMUNITY = 'hive-167922';
const PERMLINK_SLUG = 'post-04-fixture-test-pencil-icon-post';

test.describe('Post creation via pencil icon (§2.1)', () => {
  test('POST-04: pencil icon → community dropdown → submit', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true
    });

    // Start anywhere with the global header — `/` redirects to
    // /trending which mounts main-bar.tsx with the pencil icon.
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // The pencil flips between two wrappings depending on
    // useUserClient hydration:
    //   - logged-out: <DialogLogin>...<Button data-testid="nav-pencil">
    //   - logged-in:  <a href="/submit.html"><Button data-testid="nav-pencil">
    // login-btn hides under TWO different conditions (pre-hydration
    // skeleton AND post-hydration logged-in), so on a slow runner we
    // can race past `login-btn.toBeHidden` while user.isLoggedIn is
    // still false → click hits the DialogLogin trigger and never
    // navigates (job 3141819 hit exactly that). Wait for the Link
    // wrapper to materialise instead.
    const pencilLink = page
      .locator('a[href="/submit.html"]')
      .filter({ has: page.getByTestId('nav-pencil') });
    await expect(pencilLink).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await pencilLink.click();
    await page.waitForURL(/\/submit\.html(?:$|\?)/);

    const editor = new PostEditorPage(page);
    await editor.validateDefaultPostEditorIsLoaded();

    // Pick a community from the "Posting to" dropdown (this is what
    // makes POST-04 different from POST-01/03).
    await editor.selectPostingToCommunity(TARGET_COMMUNITY);

    const title = 'POST-04 fixture-test pencil icon post';
    const body = 'POST-04 body content for pencil-icon flow';
    await editor.getPostTitleInput.fill(title);
    await fillPostBody(page, body);
    await editor.getEnterYourTagsInput.fill(DEFAULT_TAG);
    await submitPost(page);

    await broadcast.waitForCount(1);
    expectCommentOperation(broadcast.calls[0], {
      // Community-selected post: parent_permlink is the community id
      // (transactionService.post: `category !== 'blog' ? category : tags[0]`).
      parent_author: '',
      parent_permlink: TARGET_COMMUNITY,
      author: POST_AUTHOR,
      body,
      permlinkPattern: new RegExp(`${PERMLINK_SLUG}$`)
    });

    await expect(editor.getPostSubmittedToast).toBeVisible();
    await page.waitForURL(
      new RegExp(`/${TARGET_COMMUNITY}/@${POST_AUTHOR}/${PERMLINK_SLUG}.*pending=1`)
    );
    await expect(new PostPage(page).articleTitle).toHaveText(title);
  });
});

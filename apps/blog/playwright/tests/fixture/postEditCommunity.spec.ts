import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { PostPage } from '../support/pages/postPage';
import { TIMEOUTS } from '../support/constants';
import {
  OWN_POST_AUTHOR,
  OWN_POST_PERMLINK,
  OWN_POST_COMMUNITY,
  EDIT_NEW_BODY,
  gotoOwnPostLoggedIn,
  enterEditMode
} from '../support/postEditingContext';

/**
 * §3 EDIT-04 — edit a post that belongs to a community.
 *
 * Fixture overlay `postEditOwn_community` sets `category`, `community`,
 * and `community_title` to the seeded community id. BlogPostOperation
 * (packages/transaction/index.ts:650) uses `category` literally when it
 * is not `'blog'`, so a community-categorised post broadcasts with
 * `parent_permlink === <community>` instead of `tags[0]`.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postEditCommunity
 */

test.use({
  fixtureTestName: 'postEditOwn_community',
  authenticatedUser: {}
});

test.describe('Post editing — community post (§3 EDIT-04)', () => {
  test('EDIT-04: edit body of community post — parent_permlink is the community id', async ({
    page
  }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true,
      postEditSwap: { author: OWN_POST_AUTHOR, permlink: OWN_POST_PERMLINK }
    });
    await gotoOwnPostLoggedIn(page);
    await enterEditMode(page);

    const editor = new PostEditorPage(page);
    await editor.getEditorContentTextarea.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type(EDIT_NEW_BODY);

    await editor.getSubmitPostButton.click();
    await broadcast.waitForCount(1);

    expect(broadcast.calls).toHaveLength(1);
    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: OWN_POST_COMMUNITY,
      author: OWN_POST_AUTHOR,
      permlink: OWN_POST_PERMLINK,
      body: EDIT_NEW_BODY
    });

    // Post-submit UI: editor closes and the refetched post (patched by
    // postEditSwap) renders the new body. Title is unchanged here so we
    // only assert on the body.
    await expect(editor.getPostSubmittedToast).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(editor.getSubmitPostButton).toBeHidden();
    const post = new PostPage(page);
    await expect(post.articleBody).toContainText(EDIT_NEW_BODY, {
      timeout: TIMEOUTS.HYDRATION
    });
  });
});

import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation,
  expectCommentOptionsOperation,
  expectDeleteCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { PostPage } from '../support/pages/postPage';
import { hbdAsset } from '../support/postCreationContext';
import { TIMEOUTS } from '../support/constants';
import {
  OWN_POST_AUTHOR,
  OWN_POST_PERMLINK,
  OWN_POST_ORIGINAL_TAGS,
  EDIT_NEW_TITLE,
  EDIT_NEW_BODY,
  gotoOwnPostLoggedIn,
  enterEditMode,
  confirmDelete
} from '../support/postEditingContext';

/**
 * Post editing — §3 EDIT-01, EDIT-02, EDIT-03a, EDIT-05.
 *
 * Shares one fixture set (`postEditOwn`) — a recording of
 * `/spam/@guest4test/test-post-1772011775775` neutralised by
 * `generate-edit-variants.mjs` so the post looks fresh-and-unvoted:
 *   - payout_at = 2030 (delete window open)
 *   - max_accepted_payout = 1_000_000 HBD (no-limit, allows all options)
 *   - net_rshares = 0 (Decline option remains available)
 *   - percent_hbd = 10000 (50/50)
 *   - json_metadata.tags = ['test', 'foo', 'bar']
 *
 * The three EDIT-03 sub-cases that need a different precondition live in
 * sibling spec files: `postEditPayoutVoted.spec.ts` (b), `postEditPayoutFinalized.spec.ts`
 * (c), and `postEditCommunity.spec.ts` for EDIT-04.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postEdit
 */

test.use({ fixtureTestName: 'postEditOwn', authenticatedUser: {} });

test.describe('Post editing — content / tags / payout (§3 EDIT-01..03a)', () => {
  test('EDIT-01: edit title and body', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true,
      postEditSwap: { author: OWN_POST_AUTHOR, permlink: OWN_POST_PERMLINK }
    });
    await gotoOwnPostLoggedIn(page);
    await enterEditMode(page);

    const editor = new PostEditorPage(page);
    await editor.getPostTitleInput.fill(EDIT_NEW_TITLE);
    // Clear the CodeMirror body and retype. The editor pre-loads the
    // original body via post_s — selectAll + delete is the cheapest way
    // to wipe it before we type the new content.
    await editor.getEditorContentTextarea.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type(EDIT_NEW_BODY);

    await editor.getSubmitPostButton.click();
    await broadcast.waitForCount(1);

    // Only comment_operation should fire — payout settings unchanged means
    // no comment_options_operation. parent_permlink = first tag (BlogPost
    // sentinel: category === 'blog' uses tags[0]; category 'spam' is taken
    // literally, see packages/transaction/index.ts:650).
    expect(broadcast.calls).toHaveLength(1);
    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: 'spam',
      author: OWN_POST_AUTHOR,
      permlink: OWN_POST_PERMLINK,
      body: EDIT_NEW_BODY
    });

    // Post-submit UI assertions. postEditSwap patches the next
    // bridge.get_post refetch with the broadcast values, so the cache
    // updates and PostBodySection re-renders with the new title/body.
    await expect(editor.getPostSubmittedToast).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(editor.getSubmitPostButton).toBeHidden();
    const post = new PostPage(page);
    await expect(post.articleTitle).toHaveText(EDIT_NEW_TITLE, {
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(post.articleBody).toContainText(EDIT_NEW_BODY);
  });

  test('EDIT-02: edit tags (remove one chip, add new tag)', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true,
      postEditSwap: { author: OWN_POST_AUTHOR, permlink: OWN_POST_PERMLINK }
    });
    await gotoOwnPostLoggedIn(page);
    await enterEditMode(page);

    const editor = new PostEditorPage(page);

    // Sanity-check the pre-edit state: the seeded tags arrive in the form
    // via post_s.json_metadata. Three chips, value === 'test foo bar'.
    await expect(editor.getEnterYourTagsInput).toHaveValue(
      OWN_POST_ORIGINAL_TAGS.join(' ')
    );

    // Remove `bar` by clicking its chip (the chip onClick handler splices
    // the tag out of `field.value`). Then append `baz` to the input.
    await page.getByTestId('tag-chips').getByText('bar', { exact: true }).click();
    await expect(editor.getEnterYourTagsInput).toHaveValue('test foo');
    await editor.getEnterYourTagsInput.fill('test foo baz');

    await editor.getSubmitPostButton.click();
    await broadcast.waitForCount(1);

    expect(broadcast.calls).toHaveLength(1);
    // For top-level posts not in a community, parent_permlink is the
    // post's category (unchanged from the original record — `spam` in
    // the neutralised base).
    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: 'spam',
      author: OWN_POST_AUTHOR,
      permlink: OWN_POST_PERMLINK
    });
    // json_metadata is encoded into the comment payload as a JSON string;
    // expectCommentOperation does not assert on metadata, so read the
    // operation directly to verify tags.
    const op = (broadcast.calls[0].params as {
      trx: { operations: { value: { json_metadata?: string } }[] };
    }).trx.operations[0].value;
    const jsonMeta = JSON.parse(op.json_metadata ?? '{}') as { tags?: string[] };
    expect(jsonMeta.tags).toEqual(['test', 'foo', 'baz']);

    // Post-submit UI: editor closes and the refetched post (patched by
    // postEditSwap) renders the new tag set. `bar` is gone, `baz` is in.
    await expect(editor.getPostSubmittedToast).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(editor.getSubmitPostButton).toBeHidden();
    const post = new PostPage(page);
    // Tags render as `#<tag>` links inside the hashtags-post list
    // (content.tsx:611-624). Match the hash-prefixed text exactly so we
    // don't collide with anything else on the page that mentions the tag.
    await expect(post.hashtagsPosts.getByText('#baz', { exact: true })).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(post.hashtagsPosts.getByText('#bar', { exact: true })).toHaveCount(0);
  });

  test('EDIT-03a: change payout (50/50 → 100% Power Up) — broadcasts comment_options', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      confirmInBlock: true,
      // Even though payout fields aren't surfaced in the rendered post, we
      // still wire postEditSwap so the no-op patch keeps the refetch shape
      // consistent and the editor-close UI signal lands deterministically.
      postEditSwap: { author: OWN_POST_AUTHOR, permlink: OWN_POST_PERMLINK }
    });
    await gotoOwnPostLoggedIn(page);
    await enterEditMode(page);

    const editor = new PostEditorPage(page);

    // The edit-mode reward select must offer all three options because the
    // base fixture has net_rshares=0 (no votes). Open the listbox and
    // verify each option is present before flipping to 100% Power Up.
    await editor.getEditRewardTypeSelect.click();
    await expect(editor.getEditRewardTypeOptions).toHaveCount(3);
    await page.getByRole('option', { name: /power up/i }).click();
    await expect(editor.getEditRewardTypeSelect).toContainText(/power up/i);

    await editor.getSubmitPostButton.click();
    // Edit + reward-change path emits TWO separate broadcasts: updatePost
    // first (comment_operation), then updatePostOptions
    // (comment_options_operation). See use-post-mutation.ts:177-200.
    await broadcast.waitForCount(2);
    expect(broadcast.calls).toHaveLength(2);

    expectCommentOperation(broadcast.calls[0], {
      parent_author: '',
      parent_permlink: 'spam',
      author: OWN_POST_AUTHOR,
      permlink: OWN_POST_PERMLINK
    });
    // updatePostOptions ships as a STANDALONE transaction here — the
    // comment_options_operation lives at operations[0] of calls[1], not
    // bundled with the comment_operation. operationIndex:0 selects it.
    expectCommentOptionsOperation(
      broadcast.calls[1],
      {
        author: OWN_POST_AUTHOR,
        permlink: OWN_POST_PERMLINK,
        max_accepted_payout: hbdAsset(1_000_000), // unchanged from neutral base
        percent_hbd: 0, // 100% Power Up
        beneficiaries: []
      },
      { operationIndex: 0 }
    );

    // Post-submit UI: success toast + editor closes. Payout / percent_hbd
    // are not surfaced in the rendered detail page directly, so the broadcast
    // assertions above cover the meaningful state change.
    await expect(editor.getPostSubmittedToast).toBeVisible({
      timeout: TIMEOUTS.HYDRATION
    });
    await expect(editor.getSubmitPostButton).toBeHidden();
  });
});

test.describe('Post deletion (§3 EDIT-05)', () => {
  test('EDIT-05: delete own post via confirmation dialog', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page, undefined, {
      postEditSwap: { author: OWN_POST_AUTHOR, permlink: OWN_POST_PERMLINK }
    });
    await gotoOwnPostLoggedIn(page);

    const post = new PostPage(page);
    await expect(post.postDeleteButton).toBeVisible();
    await confirmDelete(page);
    await broadcast.waitForCount(1);

    expect(broadcast.calls).toHaveLength(1);
    expectDeleteCommentOperation(broadcast.calls[0], {
      author: OWN_POST_AUTHOR,
      permlink: OWN_POST_PERMLINK
    });

    // Post-submit UI: useDeletePostMutation.onSuccess shows the
    // "Post deleted successfully" toast and invalidates the postData query.
    // The refetch hits bridge.get_post, postEditSwap.deleted makes it
    // return a JSON-RPC error, and PostBodySection renders the not-found
    // branch — the delete trigger disappears with it.
    await expect(
      page.getByText('Post deleted successfully', { exact: true })
    ).toBeVisible({ timeout: TIMEOUTS.HYDRATION });
    await expect(post.postDeleteButton).toBeHidden();
  });
});

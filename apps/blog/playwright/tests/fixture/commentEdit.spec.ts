import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostPage } from '../support/pages/postPage';
import {
  VOTER,
  POST_AUTHOR,
  POST_PERMLINK,
  OWN_COMMENT_AUTHOR,
  OWN_COMMENT_TOP_LEVEL_PERMLINK,
  gotoPostLoggedIn,
  ownCommentEditButton,
  ownCommentDescription,
  ownCommentEditor,
  typeIntoReplyEditor,
  submitReply
} from '../support/commentingContext';

/**
 * Comment edit — own top-level comment (§5 CMT-03).
 *
 * Runs against `commenting_ownTopLevel/` — the variant generator
 * injects a `guest4test/re-gtg-test-1` entry into bridge.get_discussion
 * with parent=post, depth=1, payout_at far-future. UI then renders the
 * edit/delete buttons for that card (visible only when
 * `comment.author === user.username`).
 *
 * Edit flow: clicking edit toggles ReplyTextbox into editMode — the new
 * body is broadcast as `comment_operation` with the EXISTING permlink
 * (no `re-…-<timestamp>` template), reusing the same parent linkage.
 */

test.use({
  fixtureTestName: 'commenting_ownTopLevel',
  authenticatedUser: {}
});

test.describe('Comment editing — own comment (§5)', () => {
  test('CMT-03: edit own top-level comment', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);

    const postPage = new PostPage(page);
    const editBtn = ownCommentEditButton(
      postPage,
      OWN_COMMENT_TOP_LEVEL_PERMLINK
    );
    // Sicarius's payout=0.293 sorts top under trending; injected own
    // comment with payout=0 lands further down — scroll into view so
    // headed mode's hover/click hits it.
    await editBtn.scrollIntoViewIfNeeded();
    await editBtn.click({ force: true });

    const newBody = 'CMT-03 fixture-test edited body';
    await typeIntoReplyEditor(page, newBody, { clearFirst: true });
    await submitReply(page);

    await broadcast.waitForCount(1);
    expectCommentOperation(broadcast.calls[0], {
      // Edit reuses parent linkage from the original comment.
      parent_author: POST_AUTHOR,
      parent_permlink: POST_PERMLINK,
      author: OWN_COMMENT_AUTHOR,
      // updateComment passes the EXISTING permlink — no template,
      // so we assert exact equality (regression catch on TX-01).
      permlink: OWN_COMMENT_TOP_LEVEL_PERMLINK,
      // `body` carried as-is when MdEditor's text matches what was
      // typed and no markdown autoformatting kicks in.
      body: newBody
    });

    // Sanity — voter is the author, not somebody else.
    expect(broadcast.calls[0].method).toBe(
      'network_broadcast_api.broadcast_transaction'
    );
    const op = (broadcast.calls[0].params as {
      trx: { operations: { value: { author: string } }[] };
    }).trx.operations[0].value;
    expect(op.author).toBe(VOTER);

    // Optimistic UI: useUpdateCommentMutation.onMutate replaces the
    // comment's body in the React Query cache before the broadcast
    // resolves; the success path then calls onSetReply(false) which
    // closes the editor. So after submit:
    //   - the editor disappears,
    //   - the new body shows up in comment-card-description.
    await expect(
      ownCommentEditor(postPage, OWN_COMMENT_TOP_LEVEL_PERMLINK)
    ).toBeHidden();
    await expect(
      ownCommentDescription(postPage, OWN_COMMENT_TOP_LEVEL_PERMLINK)
    ).toContainText(newBody);
  });
});

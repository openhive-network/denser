import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostPage } from '../support/pages/postPage';
import {
  VOTER,
  OWN_COMMENT_AUTHOR,
  OWN_COMMENT_NESTED_PERMLINK,
  gotoPostLoggedIn,
  ownCommentEditButton,
  ownCommentDescription,
  ownCommentEditor,
  typeIntoReplyEditor,
  submitReply
} from '../support/commentingContext';

/**
 * Comment edit — nested reply (§5 CMT-04).
 *
 * Runs against `commenting_ownNested/` — the variant generator injects
 * `guest4test/re-blocktrades-test-1` as a depth=2 reply under
 * blocktrades's top-level comment. Mirrors CMT-03 but the broadcast's
 * parent linkage is the *parent comment*, not the post.
 */

test.use({
  fixtureTestName: 'commenting_ownNested',
  authenticatedUser: {}
});

test.describe('Comment editing — nested reply (§5)', () => {
  test('CMT-04: edit own nested reply', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);

    const postPage = new PostPage(page);
    const editBtn = ownCommentEditButton(
      postPage,
      OWN_COMMENT_NESTED_PERMLINK
    );
    await editBtn.scrollIntoViewIfNeeded();
    await editBtn.click({ force: true });

    const newBody = 'CMT-04 fixture-test edited nested body';
    await typeIntoReplyEditor(page, newBody, { clearFirst: true });
    await submitReply(page);

    await broadcast.waitForCount(1);
    expectCommentOperation(broadcast.calls[0], {
      // Nested-reply edit reuses parent comment's identity, not post's.
      parent_author: 'blocktrades',
      parent_permlink: 'quwxu7',
      author: OWN_COMMENT_AUTHOR,
      permlink: OWN_COMMENT_NESTED_PERMLINK,
      body: newBody
    });

    expect(broadcast.calls[0].method).toBe(
      'network_broadcast_api.broadcast_transaction'
    );
    const op = (broadcast.calls[0].params as {
      trx: { operations: { value: { author: string } }[] };
    }).trx.operations[0].value;
    expect(op.author).toBe(VOTER);

    // Optimistic UI (see CMT-03 for rationale). For nested replies
    // the description selector resolves through `findCommentByIdent`
    // (`.last()`) — necessary because the parent list-item also
    // matches the timestamp-link filter as an ancestor.
    await expect(
      ownCommentEditor(postPage, OWN_COMMENT_NESTED_PERMLINK)
    ).toBeHidden();
    await expect(
      ownCommentDescription(postPage, OWN_COMMENT_NESTED_PERMLINK)
    ).toContainText(newBody);
  });
});

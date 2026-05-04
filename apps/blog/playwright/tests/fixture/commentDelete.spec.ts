import { test, expect } from '../support/fixture-proxy-test';
import {
  installBroadcastInterceptor,
  expectDeleteCommentOperation
} from '../support/fixture-auth/broadcast-interceptor';
import { PostPage } from '../support/pages/postPage';
import {
  VOTER,
  OWN_COMMENT_AUTHOR,
  OWN_COMMENT_TOP_LEVEL_PERMLINK,
  gotoPostLoggedIn,
  ownCommentDeleteButton
} from '../support/commentingContext';

/**
 * Comment delete — own top-level comment (§5 CMT-05).
 *
 * Reuses the `commenting_ownTopLevel/` overlay (variant generator
 * injects guest4test's comment with `payout_at` far in the future and
 * `replies: []` — both required by the delete-button render condition
 * in comment-list-item.tsx).
 *
 * Click flow: delete button → AlertDialogTrigger opens PostDeleteDialog
 * → flag-dialog-ok confirms → broadcast `delete_comment_operation`
 * (TX-15) and the action callback removes the comment from the cache.
 */

test.use({
  fixtureTestName: 'commenting_ownTopLevel',
  authenticatedUser: {}
});

test.describe('Comment delete — own comment (§5)', () => {
  test('CMT-05: delete own top-level comment', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);

    const postPage = new PostPage(page);
    const deleteBtn = ownCommentDeleteButton(
      postPage,
      OWN_COMMENT_TOP_LEVEL_PERMLINK
    );
    await deleteBtn.scrollIntoViewIfNeeded();
    // `force: true` is the same workaround as VOTE-C03/C04 + CMT-03 —
    // the inner `cursor-pointer` span sits under a Tooltip that
    // intermittently overlays the click target in headed Chromium.
    await deleteBtn.click({ force: true });

    // PostDeleteDialog is the same AlertDialog as FlagDialog — testids
    // are reused (`flag-dialog-*`), see post-delete-dialog.tsx.
    await expect(page.getByTestId('flag-dialog-header')).toBeVisible();
    await expect(page.getByTestId('flag-dialog-header')).toHaveText(
      /Confirm Delete Comment/
    );
    await page.getByTestId('flag-dialog-ok').click();

    await broadcast.waitForCount(1);
    expectDeleteCommentOperation(broadcast.calls[0], {
      author: OWN_COMMENT_AUTHOR,
      permlink: OWN_COMMENT_TOP_LEVEL_PERMLINK
    });

    expect(broadcast.calls[0].method).toBe(
      'network_broadcast_api.broadcast_transaction'
    );
    const op = (broadcast.calls[0].params as {
      trx: { operations: { value: { author: string } }[] };
    }).trx.operations[0].value;
    expect(op.author).toBe(VOTER);
  });
});

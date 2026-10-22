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
  gotoPostLoggedIn,
  openReplyEditor,
  postReplyTrigger,
  typeIntoReplyEditor,
  submitReply,
  findCommentByIdent,
  findCommentCardByBody,
  findNestedReplyByBody
} from '../support/commentingContext';
import { readFirstCommentIdent } from '../support/commentVotingContext';

/**
 * Comment creation — fresh state (§5 CMT-01, CMT-02).
 *
 * CMT-01 replies to the post itself (parent_author = post author).
 * CMT-02 replies to the first existing comment (parent_author = that
 * comment's author).
 *
 * Record:  FIXTURE_UPSTREAM=api.openhive.network FIXTURE_MODE=record \
 *          pnpm --filter @hive/blog test:fixture -- commentCreate.spec
 * Replay:  pnpm --filter @hive/blog test:fixture -- commentCreate.spec
 */

test.use({ fixtureTestName: 'commenting', authenticatedUser: {} });

test.describe('Comment creation — fresh state (§5)', () => {
  test('CMT-01: comment on a post', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);
    const postPage = new PostPage(page);

    await openReplyEditor(postReplyTrigger(page), page.getByTestId('reply-editor'));
    const body = 'CMT-01 fixture-test reply on post';
    await typeIntoReplyEditor(page, body);
    await submitReply(page);

    await broadcast.waitForCount(1);
    expectCommentOperation(broadcast.calls[0], {
      parent_author: POST_AUTHOR,
      parent_permlink: POST_PERMLINK,
      author: VOTER,
      body,
      // Wax templates `re-<parent>-<timestamp>`; only the timestamp
      // varies, so anchor on the prefix.
      permlinkPattern: new RegExp(`^re-${POST_AUTHOR}-\\d+$`)
    });

    // Optimistic UI: useCommentMutation.onMutate inserts the new
    // comment into the React Query cache (with `_optimistic: true`)
    // BEFORE the broadcast resolves, so the card appears in the
    // comment list immediately. Replay-mode bridge.get_discussion
    // doesn't include it, so without optimistic update we'd never
    // see the comment in DOM.
    await expect(findCommentCardByBody(postPage, body)).toBeVisible();
  });

  test('CMT-02: reply to an existing comment', async ({ page }) => {
    const broadcast = await installBroadcastInterceptor(page);
    await gotoPostLoggedIn(page);

    const postPage = new PostPage(page);
    const { author: parentAuthor, permlink: parentPermlink } =
      await readFirstCommentIdent(postPage);

    // Click the reply button on the first comment (not the post-level one).
    await openReplyEditor(
      postPage.commentCardsFooterReply.first(),
      page.getByTestId('reply-editor')
    );

    const body = 'CMT-02 fixture-test nested reply';
    await typeIntoReplyEditor(page, body);
    await submitReply(page);

    await broadcast.waitForCount(1);
    expectCommentOperation(broadcast.calls[0], {
      parent_author: parentAuthor,
      parent_permlink: parentPermlink,
      author: VOTER,
      body,
      // dots in author become hyphens in the templated permlink.
      permlinkPattern: new RegExp(
        `^re-${parentAuthor.replaceAll('.', '-')}-\\d+$`
      )
    });

    // Sanity: the new reply's permlink isn't the parent's.
    const op = (broadcast.calls[0].params as {
      trx: { operations: { value: { permlink: string } }[] };
    }).trx.operations[0].value;
    expect(op.permlink).not.toBe(parentPermlink);

    // Optimistic UI: the new reply card appears nested inside the
    // parent comment's list-item (comment-list filters by
    // parent_author/parent_permlink — see comment-list.tsx L88-89).
    const parentItem = findCommentByIdent(postPage, parentAuthor, parentPermlink);
    await expect(
      findNestedReplyByBody(postPage, parentItem, body)
    ).toBeVisible();
  });

  test('CMT-03: a double-click on the disabled Post button selects no text', async ({ page }) => {
    await gotoPostLoggedIn(page);
    await openReplyEditor(postReplyTrigger(page), page.getByTestId('reply-editor'));

    const postButton = page
      .getByTestId('reply-editor')
      .getByRole('button', { name: 'Post', exact: true });
    await expect(postButton).toBeDisabled();
    // Playwright won't double-click a disabled element, so dispatch at its position like a user would.
    // The reply editor keeps growing for a moment after it opens: wait until the button stops moving.
    await postButton.scrollIntoViewIfNeeded();
    let box = await postButton.boundingBox();
    await expect
      .poll(async () => {
        const previous = box;
        box = await postButton.boundingBox();
        return JSON.stringify(previous) === JSON.stringify(box);
      })
      .toBe(true);
    expect(box).not.toBeNull();
    if (!box) return;
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height / 2);

    // Not only its own label: a neighbouring label (Cancel) must not be selected either
    expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
  });

  test('CMT-04: a double- or triple-click between the Post and Cancel buttons selects no text', async ({ page }) => {
    await gotoPostLoggedIn(page);
    const editor = page.getByTestId('reply-editor');
    await openReplyEditor(postReplyTrigger(page), editor);

    const postButton = editor.getByRole('button', { name: 'Post', exact: true });
    const cancelButton = editor.getByRole('button', { name: 'Cancel', exact: true });
    await cancelButton.scrollIntoViewIfNeeded();
    // The reply editor keeps growing for a moment after it opens: wait until the row stops moving.
    let cancelBox = await cancelButton.boundingBox();
    await expect
      .poll(async () => {
        const previous = cancelBox;
        cancelBox = await cancelButton.boundingBox();
        return JSON.stringify(previous) === JSON.stringify(cancelBox);
      })
      .toBe(true);
    const postBox = await postButton.boundingBox();
    expect(postBox).not.toBeNull();
    expect(cancelBox).not.toBeNull();
    if (!postBox || !cancelBox) return;
    expect(cancelBox.x - (postBox.x + postBox.width), 'the buttons are apart').toBeGreaterThan(0);
    const gapX = (postBox.x + postBox.width + cancelBox.x) / 2;
    const gapY = cancelBox.y + cancelBox.height / 2;

    const selectedText = () => page.evaluate(() => window.getSelection()?.toString() ?? '');
    await page.mouse.dblclick(gapX, gapY);
    expect(await selectedText()).toBe('');
    await page.mouse.click(gapX, gapY, { clickCount: 3 });
    expect(await selectedText()).toBe('');
  });
});

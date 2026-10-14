import { test, expect } from '../support/fixture-proxy-test';
import { installBroadcastInterceptor } from '../support/fixture-auth/broadcast-interceptor';
import { PostPage } from '../support/pages/postPage';
import {
  findCommentCardByBody,
  gotoPostLoggedIn,
  openReplyEditor,
  postReplyTrigger,
  submitReply,
  typeIntoReplyEditor
} from '../support/commentingContext';
import { CODE_BLOCKS_MARKDOWN, expectCodeBlocksMarkdownRendered } from '../support/syntaxHighlightContext';

/**
 * A comment the server didn't render is rendered in the browser: the reply editor's preview, and
 * the reply once posted (shown optimistically, before any refetch). Both load the syntax
 * highlighter on the client and highlight tagged code blocks.
 *
 * Fixtures: reuses `commenting` (read-only on replay; the broadcast is stubbed).
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- syntaxHighlightComment
 */

test.use({ fixtureTestName: 'commenting', authenticatedUser: {} });

test('HL-04 — a reply is highlighted in its preview and once posted', async ({ page }) => {
  const broadcast = await installBroadcastInterceptor(page);
  await gotoPostLoggedIn(page);
  const replyEditor = page.getByTestId('reply-editor');

  await openReplyEditor(postReplyTrigger(page), replyEditor);
  await typeIntoReplyEditor(page, CODE_BLOCKS_MARKDOWN);
  await expectCodeBlocksMarkdownRendered(replyEditor.locator('#articleBody'));

  await submitReply(page);
  await broadcast.waitForCount(1);
  const postedReply = findCommentCardByBody(new PostPage(page), 'untagged block');
  await expect(postedReply).toBeVisible();
  await expectCodeBlocksMarkdownRendered(postedReply.locator('#articleBody'));
});

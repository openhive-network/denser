import { test, expect } from '../support/fixture-proxy-test';
import {
  gotoPostLoggedIn,
  openReplyEditor,
  postReplyTrigger
} from '../support/commentingContext';

/**
 * Reply editor — keyboard access (EDITOR-KBD-04).
 *
 * Same toolbar as the post editor: one Tab stop with arrow-key roving
 * focus, named buttons, option checkboxes in the Tab order, and a labelled
 * CodeMirror textbox. Re-uses the `commenting` fixture set; nothing is
 * broadcast.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- commentEditorKeyboard.spec
 */

test.use({ fixtureTestName: 'commenting', authenticatedUser: {} });

test('EDITOR-KBD-04: reply editor toolbar and options are keyboard operable', async ({ page }) => {
  await gotoPostLoggedIn(page);
  const replyEditor = page.getByTestId('reply-editor');
  await openReplyEditor(postReplyTrigger(page), replyEditor);

  const toolbar = replyEditor.getByRole('toolbar', { name: 'Formatting' });
  await expect(toolbar.locator('[tabindex="0"]')).toHaveCount(1);
  await expect(replyEditor.getByRole('textbox', { name: 'Reply' })).toBeVisible();

  const bold = toolbar.getByRole('button', { name: 'Bold', exact: true });
  await bold.focus();
  await page.keyboard.press('ArrowRight');
  await expect(toolbar.getByRole('button', { name: 'Italic' })).toBeFocused();

  const convertLinks = replyEditor.getByRole('checkbox', { name: 'Convert Hive links' });
  const wasConverting = await convertLinks.isChecked();
  await page.keyboard.press('Tab');
  await expect(convertLinks).toBeFocused();
  await page.keyboard.press('Space');
  await expect(convertLinks).toBeChecked({ checked: !wasConverting });
});

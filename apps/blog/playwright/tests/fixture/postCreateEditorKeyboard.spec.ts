import { test, expect } from '../support/fixture-proxy-test';
import { PostEditorPage } from '../support/pages/postEditorPage';
import { gotoSubmitLoggedIn } from '../support/postCreationContext';

/**
 * Post editor — keyboard access (EDITOR-KBD-01..03).
 *
 * The formatting toolbar is one Tab stop with roving focus (ArrowLeft /
 * ArrowRight / Home / End), every toolbar button has an accessible name,
 * the option checkboxes and the side-by-side / preview toggles are in the
 * Tab order, and the CodeMirror textbox is labelled. Re-uses the
 * `postCreate` fixture set: only the /submit.html page load hits RPCs.
 *
 * Replay:  pnpm --filter @hive/blog test:fixture -- postCreateEditorKeyboard.spec
 */

test.use({ fixtureTestName: 'postCreate', authenticatedUser: {} });

test.describe('Post editor — keyboard access', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSubmitLoggedIn(page);
    await new PostEditorPage(page).validateDefaultPostEditorIsLoaded();
  });

  test('EDITOR-KBD-01: toolbar is one Tab stop with arrow-key roving focus', async ({ page }) => {
    const editor = new PostEditorPage(page);
    const toolbar = page.getByRole('toolbar', { name: 'Formatting' });
    await expect(toolbar).toBeVisible();
    await expect(toolbar.locator('[tabindex="0"]')).toHaveCount(1);
    await expect(toolbar.getByRole('button')).toHaveCount(16);

    const bold = toolbar.getByRole('button', { name: 'Bold', exact: true });
    await expect(bold).toHaveAttribute('aria-keyshortcuts', 'Control+B');
    await expect(toolbar.getByRole('button', { name: 'Spoiler' })).toBeVisible();

    await editor.getPostTitleInput.focus();
    await page.keyboard.press('Tab');
    await expect(bold).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(editor.getItalicButtonInEditorToolbar).toBeFocused();
    await expect(editor.getItalicButtonInEditorToolbar).toHaveAttribute('tabindex', '0');
    await expect(bold).toHaveAttribute('tabindex', '-1');

    await page.keyboard.press('End');
    await expect(toolbar.locator('[data-name="spoiler"]')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(bold).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(toolbar.locator('[data-name="spoiler"]')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(bold).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(editor.getEditorContentTextarea).toBeFocused();
    await expect(editor.getEditorContentTextarea).toContainText('****');
  });

  test('EDITOR-KBD-02: option checkboxes follow the toolbar in Tab order and toggle with Space', async ({ page }) => {
    const editor = new PostEditorPage(page);
    const convertLinks = page.getByRole('checkbox', { name: 'Convert Hive links' });
    const optimizeImages = page.getByRole('checkbox', { name: 'Optimize images' });
    const wasConverting = await convertLinks.isChecked();

    await editor.getPostTitleInput.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(convertLinks).toBeFocused();
    await page.keyboard.press('Space');
    await expect(convertLinks).toBeChecked({ checked: !wasConverting });
    await expect(convertLinks).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(optimizeImages).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('textbox', { name: 'Post body' })).toBeFocused();
  });

  test('EDITOR-KBD-03: side-by-side and preview toggles are reachable and work with Enter', async ({ page }) => {
    const editor = new PostEditorPage(page);
    await expect(editor.getPreviewContainer).toBeVisible();

    await editor.getPostTitleInput.focus();
    await page.keyboard.press('Shift+Tab');
    await expect(editor.getHideShowPreviewButton).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(editor.getPreviewContainer).toBeHidden();
    await page.keyboard.press('Enter');
    await expect(editor.getPreviewContainer).toBeVisible();

    await page.keyboard.press('Shift+Tab');
    await expect(editor.getEnableDisableSideBySideEditor).toBeFocused();
    await expect(editor.getEnableDisableSideBySideEditor).toHaveText('Disable side-by-side editor');
    await page.keyboard.press('Space');
    await expect(editor.getEnableDisableSideBySideEditor).toHaveText('Enable side-by-side editor');
  });
});
